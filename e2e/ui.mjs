import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import http from 'node:http'
import { chromium } from 'playwright'

// Serve the built UI and intercept API calls: no real documents or provider requests.
const server = http.createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  const file = path.startsWith('/assets/') || path === '/fonts.css' || path === '/favicon.svg' ? path : '/index.html'
  try {
    const body = await readFile(`/ui${file}`)
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html')
    response.end(body)
  } catch { response.writeHead(404); response.end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://localhost:${server.address().port}`
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const game = { id: 'first', title: 'Everdell', edition: '2026', description: '', language: 'en', document_count: 1 }
const other = { ...game, id: 'second', title: 'Azul' }
const added = { ...game, id: 'new', title: 'Newly published game' }
const queries = []
let listRequests = 0
let documentRequests = 0
const adminDocuments = ['uploaded', 'processing', 'published', 'failed', 'failed'].map((status, index) => ({
  id: `admin-${index}`, filename: `${index + 1}. Rulebook.pdf`, format: 'pdf', language: 'en', usage_language: 'hu', size_bytes: 2048,
  status, version_id: status === 'uploaded' ? null : `version-${index}`, stage_code: 'extracting_text', stage_params: {}, progress: 35,
  error: status === 'failed' ? 'processing_failed' : null, error_code: status === 'failed' ? 'processing_failed' : null,
  page_count: status === 'published' ? 10 : 0, character_count: status === 'published' ? 400 : 0, chunk_count: status === 'published' ? 4 : 0,
  asset_count: 0, has_published: index === 2 || index === 3, published_version_id: index === 2 || index === 3 ? `published-${index}` : null,
  ai_status: status === 'published' ? 'complete' : 'none', ai_error_code: null,
}))
let adminAi = true
const processRequests = []
await page.route('**/api/**', async route => {
  const url = new URL(route.request().url())
  if (url.pathname === '/api/play/games') {
    listRequests++
    const query = url.searchParams.get('q') ?? ''
    queries.push(query)
    if (query === 'slow') await new Promise(resolve => setTimeout(resolve, 600))
    const games = query === 'new' ? [added] : query === 'Azul' ? [other] : query ? [] : [other, game]
    await route.fulfill({ json: games }).catch(() => {})
  } else if (url.pathname === '/api/play/capabilities') {
    await route.fulfill({ json: { explanations: true, transcription: true, max_audio_bytes: 10485760 } })
  } else if (url.pathname.endsWith('/documents')) {
    documentRequests++
    await route.fulfill({ json: url.pathname.startsWith('/api/play/')
      ? [{ id: 'doc', filename: 'Base rules.pdf', language: 'en', version_id: 'version', page_count: 1 }]
      : adminDocuments })
  } else if (url.pathname.endsWith('/processing')) {
    await route.fulfill({ json: { jobs: [] } })
  } else if (url.pathname.endsWith('/preview')) {
    await route.fulfill({ json: { version: { id: 'version', status: 'published', ai_status: 'complete' }, chunks: [{ id: 'chunk', ordinal: 0, heading: 'Movement', content: 'Move once.', page: 1, translation_hu: '', translation_en: '' }], assets: [], total_chunks: 1 } })
  } else if (/\/api\/documents\/admin-\d+\/process$/.test(url.pathname)) {
    processRequests.push(url.pathname)
    const doc = adminDocuments.find(doc => url.pathname.includes(`/${doc.id}/`))
    doc.status = 'processing'
    await new Promise(resolve => setTimeout(resolve, 250))
    await route.fulfill({ json: { version_id: 'processing-new', status: 'queued' } })
  } else if (url.pathname.endsWith('/questions')) {
    assert.deepEqual(route.request().postDataJSON().document_ids, ['doc'])
    await route.fulfill({ json: { language: 'en', status: 'answered', paragraphs: [{ text: 'You may move.', source_ids: [] }], sources: [], assets: [{ id: 'figure', caption: 'Example', page: 1, version_id: 'version' }], fallback_code: null } })
  } else if (url.pathname.includes('/assets/')) {
    await route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ioAAAAASUVORK5CYII=', 'base64') })
  } else if (url.pathname === '/api/games') {
    await route.fulfill({ json: [{ ...game, document_count: adminDocuments.length, processing_count: 1, published_count: 2 }] })
  } else if (url.pathname === '/api/ai/status') {
    await route.fulfill({ json: { processing: adminAi, explanations: adminAi } })
  } else { throw new Error(`Unexpected API request: ${url.pathname}`) }
})
async function overflow() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Horizontal overflow')
}
async function shot(name) {
  await overflow()
  await page.screenshot({ path: `/results/ui-${name}.png`, fullPage: true })
}
try {
  await page.goto(base)
  await page.getByRole('button', { name: 'Everdell', exact: true }).click()
  const question = page.getByLabel('Your question', { exact: true })
  await question.fill('Can I move?')
  assert.equal(await page.locator('.player-intro, .player-reviewed, .player-cloud-note').count(), 0)
  assert.equal(await page.locator('.player-game small, .player-selected p').count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Refresh library', exact: true }).isVisible(), false)
  assert.equal(await page.getByRole('button', { name: 'Use microphone', exact: true }).innerText(), '')
  assert.equal(await page.locator('.player-input-help').count(), 0)
  assert.equal(await page.evaluate(() => document.querySelector('.player-composer').compareDocumentPosition(document.querySelector('.player-rule-selection')) & Node.DOCUMENT_POSITION_FOLLOWING), 4)
  const search = page.getByRole('textbox', { name: 'Search games', exact: true })
  await search.focus()
  assert.equal(await search.evaluate(input => getComputedStyle(input).boxShadow), 'none')
  await shot('desktop-en')
  const docsBefore = documentRequests
  await search.fill('new')
  await page.getByRole('button', { name: added.title, exact: true }).waitFor()
  assert.ok(queries.includes('new'), 'Search must query the API, including newly published games')
  assert.equal(await question.inputValue(), 'Can I move?')
  assert.equal(documentRequests, docsBefore, 'Searching must preserve rulebook selection')
  await search.fill('slow')
  await page.waitForRequest(request => new URL(request.url()).searchParams.get('q') === 'slow')
  await search.fill('Azul')
  await page.getByRole('button', { name: other.title, exact: true }).waitFor()
  await page.waitForTimeout(700)
  assert.equal(await page.getByRole('button', { name: other.title, exact: true }).isVisible(), true, 'Older search response must not replace current results')
  await search.fill('')
  await page.getByRole('button', { name: game.title, exact: true }).waitFor()
  await page.getByRole('button', { name: 'Ask question', exact: true }).click()
  await page.getByText('You may move.', { exact: true }).waitFor()
  assert.equal(await page.locator('.player-figures > p').count(), 0)
  await page.getByRole('button', { name: 'Magyar', exact: true }).click()
  const nav = page.getByRole('navigation')
  assert.equal(await nav.getByRole('link', { name: 'Szabály keresése', exact: true }).getAttribute('aria-current'), 'page')
  await nav.getByRole('link', { name: 'Szabálykönyv feldolgozása', exact: true }).waitFor()
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    const refresh = page.getByRole('button', { name: 'Gyűjtemény frissítése', exact: true })
    assert.equal(await refresh.isVisible(), width <= 640)
    await shot(`hu-${width}`)
  }
  const refresh = page.getByRole('button', { name: 'Gyűjtemény frissítése', exact: true })
  assert.equal(await refresh.innerText(), '')
  const requestsBefore = listRequests
  await Promise.all([
    page.waitForRequest(request => new URL(request.url()).pathname === '/api/play/games'),
    refresh.click(),
  ])
  await page.waitForFunction(() => !document.querySelector('.player-refresh').disabled)
  assert.ok(listRequests > requestsBefore, 'Mobile refresh must reload the games')
  await page.getByRole('combobox', { name: 'Válassz játékot', exact: true }).selectOption(other.id)
  await page.getByRole('heading', { name: other.title, exact: true }).waitFor()
  assert.equal(await page.getByLabel('Kérdésed', { exact: true }).inputValue(), '')
  await nav.getByRole('link', { name: 'Szabálykönyv feldolgozása', exact: true }).click()
  await page.getByRole('heading', { name: 'Játékgyűjtemény', exact: true }).waitFor()
  assert.equal(await page.getByRole('navigation').getByRole('link', { name: 'Szabálykönyv feldolgozása', exact: true }).getAttribute('aria-current'), 'page')
  await shot('admin-mobile-hu')
  assert.equal(await page.locator('.admin-ai-status').count(), 0)
  const adminSearch = page.getByRole('textbox', { name: 'Játékok keresése', exact: true })
  await adminSearch.fill('Everdell')
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    const searchBox = await adminSearch.boundingBox()
    const newBox = await page.getByRole('button', { name: 'Új játék', exact: true }).first().boundingBox()
    assert.ok(searchBox.x < newBox.x && Math.abs(searchBox.y + searchBox.height / 2 - newBox.y - newBox.height / 2) < 2, `Search must be left of New game: ${JSON.stringify({ width, searchBox, newBox })}`)
    await shot(`admin-collection-${width}`)
  }
  await page.locator('.game-card').click()
  await page.getByRole('heading', { name: '1. Rulebook.pdf', exact: true }).waitFor()
  assert.equal(await page.locator('.game-info, .info-note').count(), 0)
  const cards = page.locator('.document-card')
  const view = card => card.getByRole('button', { name: 'Szabályok megtekintése', exact: true })
  const enrich = card => card.getByRole('button', { name: 'Fordítás és keresés frissítése', exact: true })
  assert.equal(await view(cards.nth(0)).isDisabled(), true)
  assert.equal(await cards.nth(0).getByRole('button', { name: 'Feldolgozás', exact: true }).isEnabled(), true)
  assert.equal(await enrich(cards.nth(0)).isDisabled(), true)
  assert.equal(await view(cards.nth(1)).isDisabled(), true)
  assert.equal(await cards.nth(1).getByRole('button', { name: 'Újrafeldolgozás', exact: true }).isDisabled(), true)
  assert.equal(await enrich(cards.nth(1)).isDisabled(), true)
  assert.equal(await view(cards.nth(2)).isEnabled(), true)
  assert.equal(await enrich(cards.nth(2)).isEnabled(), true)
  await cards.nth(2).getByText('Bővített keresés kész', { exact: true }).waitFor()
  assert.equal(await view(cards.nth(3)).isEnabled(), true, 'Previous rules remain viewable after failure')
  assert.equal(await enrich(cards.nth(3)).isEnabled(), true, 'Previous extracted rules allow translation retry')
  assert.equal(await view(cards.nth(4)).isDisabled(), true)
  assert.equal(await enrich(cards.nth(4)).isDisabled(), true)
  assert.equal(await cards.nth(4).getByRole('button', { name: 'Feldolgozás újrapróbálása', exact: true }).isEnabled(), true)
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await shot(`admin-rules-${width}`)
    assert.equal(await cards.nth(2).locator('.document-actions .button').count(), 4)
    assert.equal(await cards.nth(2).locator('.document-actions .button:not(.secondary)').count(), 0)
    const sizes = await cards.nth(2).locator('.document-actions .button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height))
    assert.equal(new Set(sizes).size, 1, 'Document action buttons must have equal heights')
  }
  await view(cards.nth(2)).click()
  await page.getByRole('dialog').getByText('Move once.', { exact: true }).waitFor()
  assert.equal(await page.getByRole('dialog').getByRole('button', { name: /közzéteszem/ }).count(), 0)
  await page.getByRole('button', { name: 'Bezárás', exact: true }).click()
  await cards.nth(0).getByRole('button', { name: 'Feldolgozás', exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('.document-card .badge.processing').length === 2)
  assert.equal(await cards.nth(0).getByRole('button', { name: 'Újrafeldolgozás', exact: true }).isDisabled(), true)
  assert.equal(processRequests.length, 1)
  adminAi = false
  await page.reload()
  await page.locator('.game-card').click()
  await page.getByRole('heading', { name: '3. Rulebook.pdf', exact: true }).waitFor()
  assert.equal(await enrich(page.locator('.document-card').nth(2)).isDisabled(), true, 'AI action must be disabled when unavailable')
  assert.deepEqual(errors, [])
  console.log('PASS: player search and responsive UI; admin search placement, compact cards, uniform buttons, uploaded/processing/published/failed action states, previous-version preview, processing request, AI availability, no manual publication, 320–1440px. No real provider calls.')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
