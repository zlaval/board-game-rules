# Player interface implementation and validation

Date: 2026-10-07.

## Implemented

- Public household reader at `/`; household administrator at `/admin` without authentication.
- Responsive English/Hungarian interface, English by default, with persisted language choice.
- Published-game selection, edition display and explicit selection of published rulebooks.
- Game URL parameter for reloading or sharing a selected game. Changing the game or rulebook selection clears question history.
- Written questions and local prefix keyword retrieval, scoped to selected published versions. Nearby source sections are added for AI context to include examples and exceptions.
- Optional OpenAI Responses API explanations with structured paragraphs and source IDs. The server validates source IDs and image IDs against the retrieved context. Conflict, insufficient-evidence, no-match and provider-failure states are explicit.
- Small selected rulebooks are provided in full; larger rulebooks use a bounded excerpt context. Explanations use the selected interface language. Original rules and already-generated answers keep their original language.
- Source dialogs, original-document links, stable text section references and PDF page references. Published PDF originals are served inline.
- Original figures from source pages and enlargement dialogs. This is page-level association, not verified identification of a particular card or token.
- Browser MediaRecorder capture, 60-second recording bound, 10 MB upload limit, server-side transcription, editable recognized text and cancellation.
- Bounded provider concurrency and request rate, timeout without automatic retries, no server-side question history or recording storage. Keys are passed server-side to the API and worker containers.
- Updated English/Hungarian README and startup configuration templates. Existing credentials are preserved.

## Verification

- 45 backend tests passed in a separate temporary PostgreSQL database. This includes the previous admin/OCR/GPU checks plus public/private boundaries, rulebook selection, game isolation, version swapping, search/no-match, request limits, original source/image access and bounded context.
- The actual OpenAI Python SDK parses Responses API results through a mocked HTTP transport. Cases include valid citations, unknown citations/images, uncited claims, provider failure, insufficient evidence and conflict.
- Image tests verify that figures can only be returned for cited source pages in the same version. A model-supplied image on an uncited page causes fallback to original search results.
- The actual SDK constructs a multipart transcription request with an audio file and a Hungarian language hint; the response is supplied by a mock HTTP transport.
- TypeScript/Vite production build and Ruff checks passed.
- Existing bilingual administrator browser flow passed at `/admin`.
- Chromium player flow passed: no admin session, published-game selection, local search, no-match state, source/original access, rulebook selection, English/Hungarian switching without losing draft text, game switching, URL reload and administrator separation.
- Desktop, 390 × 844 mobile and 820 × 1180 tablet layouts have no horizontal overflow. Screenshots are stored in `test-results/player-*.png`.
- A source-cited AI answer is rendered, its source dialog is opened and an original figure is enlarged using intercepted test responses.
- A real browser MediaRecorder records Chromium's synthetic microphone through a localhost proxy. Its upload receives a test transcription; text is editable and no question is sent automatically. Cancelling a second recording does not upload it or overwrite the edited question.
- Browser checks make no real OpenAI calls and spend no provider credits. Synthetic test games are identified separately from existing household content for targeted cleanup.

## Remaining acceptance and limits

OpenAI configuration enables explanations and rule processing. The API and worker both receive the server-side key. See [AI validation](ai-validation.md) for current checks; physical microphone acceptance remains separate.

AI-indexed books use multilingual embeddings combined with bilingual keyword search. Existing books require AI processing and publication to gain that index. The full-context path also supports different-language questions for small books. Distant exceptions can be missed by bounded retrieval. Evaluate on actual game rulebooks before relying on explanations. Identifier validation establishes that a source belongs to the selected material, not that every generated claim is semantically correct.

Question history contains the latest six independent questions in browser memory. Follow-up pronouns are not resolved from previous questions. Refresh clears history. Reader access is intended for a trusted household network; published originals are deliberately public on the configured bind address. The admin interface now opens without authentication for trusted home-network use. The shared top menu switches between Questions and Admin; reader endpoints continue to return published material only.

Microphone capture from a phone to a server IP needs trusted HTTPS. The default Compose configuration still serves HTTP. Physical Android/iOS microphone permission, recording, cancellation, transcription and source/image viewing need a separate HTTPS deployment acceptance check. PWA installation and conversational follow-ups remain future work; AI translations and semantic retrieval are now implemented.
