import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.BASE_URL ?? 'http://frontend'
await mkdir('/results', { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
const title = `__e2e__ Admin próba ${Date.now()}`
try {
  await page.goto(base)
  await page.getByLabel('Felhasználónév').fill(process.env.ADMIN_USERNAME ?? 'admin')
  await page.getByLabel('Jelszó', { exact: true }).fill(process.env.ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Belépés', exact: true }).click()
  await page.getByRole('heading', { name: 'A játékpolcod' }).waitFor()
  await page.screenshot({ path: '/results/admin-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Új játék', exact: true }).click()
  await page.getByLabel(/A játék neve/).fill(title)
  await page.getByLabel('Kiadás', { exact: true }).fill('2026 · Tesztkiadás')
  await page.getByLabel('Rövid leírás').fill('Automatikus adminfolyamat-ellenőrzés; a teszt után eltávolítjuk.')
  await page.getByRole('button', { name: 'Játék hozzáadása', exact: true }).click()
  await page.getByRole('heading', { name: title, exact: true }).waitFor()
  const games = await (await context.request.get(`${base}/api/games`)).json()
  const game = games.find(g => g.title === title)
  assert.ok(game)
  await writeFile('/results/created-game.json', JSON.stringify({ id: game.id }))
  await page.getByRole('button', { name: 'Szabályanyag feltöltése', exact: true }).click()
  await page.getByRole('button', { name: 'Szöveg beillesztése' }).click()
  await page.getByLabel('Dokumentum neve').fill('Admin próba szabály')
  await page.getByLabel('Szabályszöveg').fill('# Előkészületek\n\nMinden játékos három kártyát kap.\n\n# Körök\n\nEgy körben két akciót végezhetsz. Támadás után nem mozoghatsz.\n\n# Kivétel\n\nA futár támadás után is mozoghat.')
  await page.getByRole('button', { name: 'Feltöltés és feldolgozás', exact: true }).click()
  await page.getByRole('button', { name: 'Ellenőrzés', exact: true }).waitFor({ timeout: 60000 })
  await page.screenshot({ path: '/results/admin-document.png', fullPage: true })
  await page.getByRole('button', { name: 'Ellenőrzés', exact: true }).click()
  await page.getByText('Minden játékos három kártyát kap.', { exact: true }).waitFor()
  await page.getByLabel('Keresés a feldolgozott dokumentumban').fill('futár')
  const searchResponse = page.waitForResponse(response => response.url().includes('/preview?q=fut%C3%A1r') && response.status() === 200)
  await page.getByRole('button', { name: 'Keresés', exact: true }).click()
  await searchResponse
  await page.waitForFunction(() => document.querySelectorAll('.chunk').length === 1)
  await page.getByText('A futár támadás után is mozoghat.', { exact: true }).waitFor()
  assert.equal(await page.locator('.chunk').count(), 1)
  await page.screenshot({ path: '/results/admin-preview.png', fullPage: true })
  await page.getByRole('button', { name: 'Ellenőriztem, közzéteszem' }).click()
  await page.locator('.document-card .badge.published').waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: '/results/admin-mobile.png', fullPage: true })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'Mobile page overflows horizontally')
  await page.getByRole('button', { name: 'Újrafeldolgozás', exact: true }).click()
  await page.getByRole('button', { name: 'Ellenőrzés', exact: true }).waitFor({ timeout: 60000 })
  await page.getByText('A korábban közzétett változat továbbra is megmarad.').waitFor()
  await page.getByRole('button', { name: 'Közzétett változat', exact: true }).click()
  await page.locator('.preview-title .badge.published').waitFor()
  await page.getByText('Minden játékos három kártyát kap.', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Bezárás', exact: true }).click()
  await page.getByRole('button', { name: 'Kijelentkezés' }).click()
  await page.getByRole('heading', { name: 'Üdv a Szabálytárban' }).waitFor()
  assert.deepEqual(errors, [])
  console.log('PASS: browser login, game creation, text upload, worker processing, search, publication, reprocessing, mobile layout and logout; no JavaScript errors.')
} catch (error) {
  await page.screenshot({ path: '/results/failure.png', fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser.close()
}

