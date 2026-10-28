import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base = process.env.BASE_URL;
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1366,height:900}});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => {
  if (/\/transcriptions|\/questions|\/process(?:\?|$)/.test(request.url())) throw new Error('Unexpected provider/processing request.');
});
try {
  const limits = await (await page.request.get(base + '/api/upload-limits')).json();
  assert.deepEqual(limits, {max_upload_bytes:200 * 1024 * 1024});
  await page.goto(base + '/admin');
  await page.locator('.game-card').first().click();
  await page.getByRole('button', {name:'Upload rule material', exact:true}).first().click();
  await page.getByRole('dialog').getByText('PDF, TXT, Markdown, PNG, JPG, WebP · up to 200 MB per file', {exact:true}).waitFor();
  await page.getByRole('dialog').getByRole('button', {name:'Cancel', exact:true}).click();
  const games = await (await page.request.get(base + '/api/play/games')).json();
  assert.ok(games.length);
  const capabilities = await (await page.request.get(base + '/api/play/capabilities')).json();
  await page.goto(base + '?game=' + games[0].id);
  await page.getByLabel('Your question', {exact:true}).waitFor();
  const microphone = page.getByRole('button', {name:'Use microphone', exact:true});
  assert.equal(await microphone.isEnabled(), capabilities.transcription);
  assert.equal(await page.evaluate(() => isSecureContext), false);
  assert.equal(await page.locator('.player-composer input[type=file]').count(), 0);
  await page.screenshot({path:'/results/deployed-upload-voice-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({path:'/results/deployed-upload-voice-mobile.png',fullPage:true});
  assert.deepEqual(errors, []);
  console.log('PASS: deployed 200 MB upload dialog, HTTP microphone button follows provider availability, no audio-file input, desktop/mobile rendering and no paid provider or processing requests.');
} finally { await browser.close(); }
