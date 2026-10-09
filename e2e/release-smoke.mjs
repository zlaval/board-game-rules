import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';

const base = process.env.BASE_URL;
assert.ok(base, 'BASE_URL is required; use an isolated release test instance.');
const statePath = '/results/release-smoke-state.json';
async function request(path, body) {
  const response = await fetch(base + '/api' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {'Content-Type': 'application/json', 'Accept-Language': 'en'},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.ok(response.ok, `${path}: HTTP ${response.status} ${await response.clone().text()}`);
  return response.json();
}

assert.deepEqual(await request('/health'), {status: 'ok'});
const capabilities = await request('/play/capabilities');
assert.equal(capabilities.explanations, false, 'The release test must not have an API key.');
assert.equal(capabilities.transcription, false);
let state;
if (process.env.VERIFY_PERSISTENCE === '1') {
  state = JSON.parse(await readFile(statePath, 'utf8'));
} else {
  assert.deepEqual(await request('/games'), [], 'Fresh release volumes must be empty.');
  const title = '__e2e__ Release installation';
  const game = await request('/games', {title, language: 'en'});
  const content = '# Setup\n\nEach player receives three cards.\n\n# Movement\n\nOn your turn you may move two spaces.';
  const document = await request(`/games/${game.id}/documents/text`, {title: 'Release rules', content, language: 'en'});
  const version = await request(`/documents/${document.id}/process`, {});
  state = {gameId: game.id, documentId: document.id, versionId: version.version_id, title, content};
  const deadline = Date.now() + 120_000;
  while (true) {
    const documents = await request(`/games/${game.id}/documents`);
    const current = documents.find(row => row.id === document.id);
    assert.notEqual(current.status, 'failed', JSON.stringify(current));
    if (current.status === 'published') break;
    assert.ok(Date.now() < deadline, 'Worker did not publish the rulebook within two minutes.');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  await writeFile(statePath, JSON.stringify(state));
}

const games = await request('/play/games?q=Release installation');
assert.equal(games.length, 1);
assert.equal(games[0].id, state.gameId);
const documents = await request(`/play/games/${state.gameId}/documents`);
assert.equal(documents[0].version_id, state.versionId);
const answer = await request(`/play/games/${state.gameId}/questions`, {question: 'How many cards?', document_ids: [state.documentId]});
assert.equal(answer.status, 'search_results');
assert.ok(answer.sources.some(source => source.content.includes('three cards')));
const original = await fetch(base + `/api/play/games/${state.gameId}/documents/${state.documentId}/original`);
assert.equal(original.status, 200);
assert.equal(await original.text(), state.content);
console.log(process.env.VERIFY_PERSISTENCE === '1'
  ? 'PASS: published rulebook, original file and local search persist after Compose shutdown/restart.'
  : 'PASS: fresh release startup, empty library, text upload, real CPU worker, automatic publication, original file and local search without an API key.');
