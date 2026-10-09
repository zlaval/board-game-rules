import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import http from 'node:http'

const base = process.env.BASE_URL ?? 'http://frontend'
// A localhost reverse proxy gives browser media APIs a trustworthy origin without
// disabling their secure-context checks or changing the application's LAN setup.
const proxy = http.createServer((incoming, outgoing) => {
  const upstream = http.request(new URL(incoming.url, base), { method: incoming.method, headers: incoming.headers }, response => {
    outgoing.writeHead(response.statusCode, response.headers)
    response.pipe(outgoing)
  })
  upstream.on('error', () => { outgoing.writeHead(502); outgoing.end() })
  incoming.pipe(upstream)
})
await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve))
const uiBase = `http://localhost:${proxy.address().port}`
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'hu-HU' })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
const created = []
const title = `__e2e__ Reader ${Date.now()}`
const rules = '# Attack\n\nAfter an attack you cannot move.\n\n# Courier\n\nThe courier can move after an attack.\n\n# Setup\n\nEach player receives three cards.'
async function api(path, body) {
  const response = body === undefined ? await context.request.get(`${base}/api${path}`) : await context.request.post(`${base}/api${path}`, { data: body })
  assert.ok(response.ok(), `${path}: ${response.status()} ${await response.text()}`)
  return response.json()
}
async function fixture(name, text, publish = true) {
  const game = await api('/games', { title: name, edition: '2026', language: 'en' })
  created.push(game.id)
  await writeFile('/results/player-created-games.json', JSON.stringify(created))
  const doc = await api(`/games/${game.id}/documents/text`, { title: 'Reader rules', content: text, language: 'en' })
  if (!publish) return { game, doc }
  const version = await api(`/documents/${doc.id}/process`, {})
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    const documents = await api(`/games/${game.id}/documents`)
    if (documents[0].status === 'published') { ready = true; break }
    assert.notEqual(documents[0].status, 'failed')
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert.ok(ready, 'Worker did not process the reader fixture')
  return { game, doc, version: version.version_id, preview: await api(`/versions/${version.version_id}/preview`) }
}
async function language(value) {
  await page.getByRole('button', { name: value === 'en' ? 'English' : 'Magyar', exact: true }).click()
  await page.waitForFunction(value => document.documentElement.lang === value, value)
}
async function overflow() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Horizontal overflow')
}
try {
  const main = await fixture(title, rules)
  const other = await fixture(`${title} Other edition`, '# Courier\n\nThe courier may teleport to Mars.')
  const draft = await fixture(`${title} Draft`, '# Secret\n\nUnpublished rules must not appear.', false)
  assert.equal((await context.request.get(`${base}/api/games`)).status(), 401)
  const realCapabilities = await api('/play/capabilities')
  // Never spend real provider credits from browser checks, even on a configured deployment.
  await page.route('**/api/play/capabilities', route => route.fulfill({ json: { explanations: false, transcription: false, max_audio_bytes: 10485760 } }))
  if (realCapabilities.explanations) {
    await page.route(`**/api/play/games/${main.game.id}/questions`, route => route.fulfill({ json: {
      language: route.request().headers()['accept-language'] ?? 'en', status: 'search_results', paragraphs: [], assets: [], fallback_code: 'ai_not_configured',
      sources: main.preview.chunks.map(row => ({ ...row, document_id: main.doc.id, version_id: main.version, filename: 'Reader rules.md', language: 'en' })),
    } }))
  }
  await page.goto(uiBase)
  await page.getByRole('navigation').getByRole('link', { name: 'Rule search', exact: true }).waitFor()
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  await page.getByRole('button', { name: title, exact: true }).click()
  await page.getByLabel('Your question', { exact: true }).waitFor()
  assert.equal(await page.getByText(draft.game.title, { exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Use microphone' }).isDisabled(), true)
  await page.getByLabel('Your question', { exact: true }).fill('Can the courier move after an attack?')
  await page.getByRole('button', { name: 'Ask question', exact: true }).click()
  await page.getByText('Matching rule sections', { exact: true }).waitFor()
  await page.getByText('The courier can move after an attack.', { exact: true }).waitFor()
  assert.equal(await page.getByText(/teleport to Mars/).count(), 0)
  await overflow()
  await page.screenshot({ path: '/results/player-desktop-en.png', fullPage: true })
  await page.getByRole('button', { name: 'Open source', exact: true }).first().click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('link', { name: 'Open original document' }).waitFor()
  const original = await dialog.getByRole('link', { name: 'Open original document' }).getAttribute('href')
  assert.equal((await context.request.get(`${base}${original}`)).status(), 200)
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByLabel('Your question', { exact: true }).fill('courier')
  await language('hu')
  assert.equal(await page.getByLabel('Kérdésed', { exact: true }).inputValue(), 'courier')
  await page.getByText('Kapcsolódó szabályrészek', { exact: true }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await overflow()
  await page.screenshot({ path: '/results/player-mobile-hu.png', fullPage: true })
  await language('en')
  await overflow()
  await page.screenshot({ path: '/results/player-mobile-en.png', fullPage: true })
  await page.getByText('Rulebooks in use', { exact: false }).click()
  await page.getByRole('checkbox', { name: 'Reader rules.md' }).uncheck()
  assert.equal(await page.getByRole('button', { name: 'Ask question', exact: true }).isDisabled(), true)
  assert.equal(await page.locator('.player-turn').count(), 0)
  await page.getByRole('checkbox', { name: 'Reader rules.md' }).check()
  await page.getByLabel('Your question', { exact: true }).fill('purple unicorn')
  await page.getByRole('button', { name: 'Ask question', exact: true }).click()
  if (!realCapabilities.explanations) await page.getByText('No matching rule', { exact: true }).waitFor()
  await page.getByRole('combobox', { name: 'Choose a game', exact: true }).selectOption(other.game.id)
  assert.equal(await page.locator('.player-turn').count(), 0)
  assert.equal(await page.getByLabel('Your question', { exact: true }).inputValue(), '')
  await page.getByRole('combobox', { name: 'Choose a game', exact: true }).selectOption(main.game.id)
  await page.reload()
  await page.getByRole('heading', { name: title, exact: true }).waitFor()
  await page.setViewportSize({ width: 820, height: 1180 })
  await overflow()
  await page.screenshot({ path: '/results/player-tablet-en.png', fullPage: true })
  // Provider-backed answer rendering uses intercepted responses; SDK/citation checks run on the backend.
  const source = { ...main.preview.chunks[1], document_id: main.doc.id, version_id: main.version, filename: 'Reader rules.md', language: 'en' }
  const figureId = '00000000-0000-4000-8000-000000000001'
  await page.route(`**/api/play/games/${main.game.id}/assets/${figureId}`, route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ioAAAAASUVORK5CYII=', 'base64') }))
  await page.unroute(`**/api/play/games/${main.game.id}/questions`)
  await page.route(`**/api/play/games/${main.game.id}/questions`, route => route.fulfill({ json: {
    language: 'en', status: 'answered', paragraphs: [{ text: 'Yes. The courier is an exception and may move after attacking.', source_ids: [source.id] }], sources: [source], assets: [{ id: figureId, version_id: main.version, caption: 'Courier marker', page: 2 }], fallback_code: null,
  } }))
  await page.getByLabel('Your question', { exact: true }).fill('Can the courier move after attacking?')
  await page.getByRole('button', { name: 'Ask question', exact: true }).click()
  await page.getByText('Answer with sources', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Source 1 · Section 2', exact: true }).click()
  await page.getByRole('dialog').getByText('The courier can move after an attack.', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Enlarge figure: Courier marker' }).click()
  await page.getByRole('dialog').getByRole('img', { name: 'Courier marker' }).waitFor()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.screenshot({ path: '/results/player-answer-en.png', fullPage: true })
  // Real browser MediaRecorder on a synthetic microphone; transcription itself is mocked.
  let transcriptionUploads = 0
  await page.unroute('**/api/play/capabilities')
  await page.route('**/api/play/capabilities', route => route.fulfill({ json: { explanations: true, transcription: true, max_audio_bytes: 10485760 } }))
  await page.route('**/api/play/transcriptions', async route => {
    transcriptionUploads++
    assert.ok(route.request().postDataBuffer().byteLength > 1000, 'No audio bytes were uploaded')
    await route.fulfill({ json: { text: 'Can the courier move after attacking?' } })
  })
  await page.reload()
  await page.getByRole('button', { name: 'Use microphone', exact: true }).waitFor()
  await page.waitForFunction(() => !document.querySelector('.player-microphone')?.disabled)
  await page.getByRole('button', { name: 'Use microphone', exact: true }).click()
  await page.getByRole('button', { name: 'Stop recording', exact: true }).waitFor()
  await page.waitForTimeout(1400)
  await page.getByRole('button', { name: 'Stop recording', exact: true }).click()
  await page.getByText('Check the recognized text and edit it before sending your question.', { exact: true }).waitFor()
  assert.equal(await page.getByLabel('Your question', { exact: true }).inputValue(), 'Can the courier move after attacking?')
  assert.equal(await page.locator('.player-turn').count(), 0, 'Transcription must not submit a question automatically')
  assert.equal(transcriptionUploads, 1)
  await page.getByLabel('Your question', { exact: true }).fill('My edited question')
  await page.getByRole('button', { name: 'Use microphone', exact: true }).click()
  await page.getByRole('button', { name: 'Stop recording', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.equal(await page.getByLabel('Your question', { exact: true }).inputValue(), 'My edited question')
  assert.equal(transcriptionUploads, 1)
  await page.getByRole('link', { name: 'Process rulebooks', exact: true }).click()
  await page.getByRole('heading', { name: 'Game collection' }).waitFor()
  assert.deepEqual(errors, [])
  console.log('PASS: public reader, published-game isolation, literal search/no-match states, source/original links, rulebook selection, language switching, game reset/deep link, desktop/mobile/tablet, cited answer UI, real MediaRecorder with mocked transcription, cancellation, shared top navigation; no JavaScript errors. No real OpenAI requests made.')
} catch (error) {
  await page.screenshot({ path: '/results/player-failure.png', fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser.close()
  await new Promise(resolve => proxy.close(resolve))
}
