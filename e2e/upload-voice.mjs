import assert from 'node:assert/strict';
import {mkdtemp, open, readFile, rm} from 'node:fs/promises';
import http from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';

const fixtures = await mkdtemp(join(tmpdir(), 'ruleshelf-upload-'));
for (const size of [200, 201]) {
  const file = await open(join(fixtures, `upload-${size}mb.pdf`), 'w');
  try { await file.truncate(size * 1024 * 1024); } finally { await file.close(); }
}
const server = http.createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const file = path.startsWith('/assets/') || path === '/fonts.css' || path === '/favicon.svg' ? path : '/index.html';
  try {
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html');
    response.end(await readFile(`/ui${file}`));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '0.0.0.0', resolve));
const base = `http://ruleshelf.test:${server.address().port}`;
const browser = await chromium.launch({args: [
  '--host-resolver-rules=MAP ruleshelf.test 127.0.0.1', '--no-proxy-server',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
]});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let uploads = 0;
let transcriptions = 0;
let uploadBytes = 200 * 1024 * 1024;
const game = {id: 'game', title: 'Upload and voice test', edition: '', language: 'en', document_count: 1};
async function mock(route) {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/upload-limits') return route.fulfill({json: {max_upload_bytes: uploadBytes}});
  if (path === '/api/play/capabilities') return route.fulfill({json: {explanations: false, transcription: true, max_audio_bytes: 10485760}});
  if (path === '/api/ai/status') return route.fulfill({json: {explanations: false, processing: false}});
  if (path === '/api/play/transcriptions') {
    transcriptions++;
    assert.ok(route.request().postDataBuffer().length > 0);
    return route.fulfill({json: {text: 'Can I move after attacking?'}});
  }
  if (path === '/api/games/game/documents' && route.request().method() === 'POST') {
    uploads++;
    return route.fulfill({status: 201, json: {id: 'uploaded'}});
  }
  if (path.endsWith('/documents')) return route.fulfill({json: path.startsWith('/api/play/')
    ? [{id: 'doc', filename: 'Rules.pdf', version_id: 'version', language: 'en', page_count: 1}]
    : []});
  if (path.endsWith('/processing')) return route.fulfill({json: {jobs: []}});
  if (path.endsWith('/games')) return route.fulfill({json: [game]});
  throw new Error(`Unexpected API request: ${route.request().method()} ${path}`);
}
await page.route('**/api/**', mock);
try {
  await page.goto(base + '?game=game');
  await page.getByLabel('Your question', {exact: true}).waitFor();
  assert.equal(await page.evaluate(() => isSecureContext), false, 'Use a genuine insecure HTTP origin.');
  const microphone = page.getByRole('button', {name: 'Use microphone', exact: true});
  assert.equal(await microphone.isEnabled(), true, 'HTTP alone must not disable the microphone button.');
  await microphone.click();
  await page.getByRole('alert').filter({hasText: 'Check your browser settings'}).waitFor();
  assert.equal(transcriptions, 0);
  assert.equal(await page.locator('.player-composer input[type=file]').count(), 0, 'No audio file fallback.');

  await page.goto(base + '/admin');
  await page.locator('.game-card').click();
  await page.getByRole('button', {name: 'Upload rule material', exact: true}).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByText('PDF, TXT, Markdown, PNG, JPG, WebP · up to 200 MB per file', {exact: true}).waitFor();
  await dialog.getByRole('checkbox', {name: 'Start processing after upload'}).uncheck();
  await dialog.locator('input[type=file]').setInputFiles(join(fixtures, 'upload-201mb.pdf'));
  await dialog.getByRole('button', {name: 'Upload', exact: true}).click();
  await dialog.getByRole('alert').filter({hasText: 'no larger than 200 MB'}).waitFor();
  assert.equal(uploads, 0, 'Reject files above the configured limit before sending.');
  await dialog.locator('input[type=file]').setInputFiles(join(fixtures, 'upload-200mb.pdf'));
  await dialog.getByRole('button', {name: 'Upload', exact: true}).click();
  await dialog.waitFor({state: 'hidden'});
  assert.equal(uploads, 1, 'The upload dialog must accept a file of exactly 200 MB.');
  uploadBytes = 75 * 1024 * 1024;
  await page.getByRole('button', {name: 'Upload rule material', exact: true}).click();
  dialog = page.getByRole('dialog');
  await dialog.getByText('PDF, TXT, Markdown, PNG, JPG, WebP · up to 75 MB per file', {exact: true}).waitFor();
  await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();

  // Simulate a browser that grants microphone access on HTTP. isSecureContext
  // stays false so this also catches a reintroduced application HTTPS gate.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {configurable: true, value: {
      getUserMedia: async () => {
        const context = new AudioContext();
        const source = context.createOscillator();
        const destination = context.createMediaStreamDestination();
        source.connect(destination);
        source.start();
        const stream = destination.stream;
        stream.getTracks().forEach(track => {
          const stop = track.stop.bind(track);
          track.stop = () => { stop(); source.stop(); void context.close(); };
        });
        return stream;
      },
    }});
  });
  await page.goto(base + '?game=game');
  await page.getByRole('button', {name: 'Use microphone', exact: true}).click();
  await page.getByRole('button', {name: 'Stop recording', exact: true}).waitFor();
  await page.waitForTimeout(1100);
  await page.getByRole('button', {name: 'Stop recording', exact: true}).click();
  await page.waitForFunction(() => document.querySelector('#player-question')?.value === 'Can I move after attacking?');
  assert.equal(transcriptions, 1);
  assert.equal(await page.locator('.player-turn').count(), 0, 'Transcription must not submit a question.');
  assert.deepEqual(errors, []);
  console.log('PASS: 200 MB limit, configured 75 MB limit, oversized file rejection, enabled HTTP microphone, readable unavailable-device error, browser-enabled recording/transcription on HTTP, no audio-file upload or provider calls.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await rm(fixtures, {recursive:true, force:true});
}
