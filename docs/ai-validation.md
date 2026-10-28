# AI rule processing and explanations

OpenAI features are optional. Set your own `OPENAI_API_KEY` in the deployment's private `.env`, then recreate the API and worker. The key stays server-side; the frontend receives capability flags only. Model names and processing bounds are configurable in the [main README](../README.md).

## Document enrichment

Uploads retain source language and selected usage languages: English, Hungarian or both. The worker generates only required translations, topic keywords and 1536-dimensional embeddings. Matching source/usage languages skip translation while still indexing original rules. Original text, page references and figures remain unchanged.

**Update translation and search** creates a new version from existing extracted material without repeating OCR. The prior published version remains available until the new version succeeds and is published automatically. Complete, partial, failed, skipped-by-limit and unprocessed states distinguish enrichment outcomes. Translation failure can still retain original-text embeddings and a partial status.

Processing is bounded by configured character/section limits. Repeated batch failures stop further provider requests; original extraction remains available. See [processing behavior](processing-validation.md) for batching and progress reporting.

## Questions and provenance

Small selected rulebooks use complete original context. Larger books combine keyword and semantic retrieval, section expansion and page-reference hints within a fixed context budget. See [retrieval behavior](retrieval-validation.md).

Translations and keywords assist discovery. Explanations use original rule excerpts as evidence, with source and figure identifiers restricted to the supplied context and checked by the server. Invalid output falls back to original search results. Citation validation proves source membership, not semantic correctness; translations and explanations still need human review.

## Data and availability

Translation and embedding send relevant text to OpenAI. Explanations send the question and selected excerpts; transcription sends recorded audio. Generated responses request `store=false`. The application stores neither recordings nor question history in its database; provider handling follows the user's OpenAI account settings.

Provider access requires internet, model access and a valid key and can incur charges. Concurrency, rate and timeout limits are operational bounds, not a monetary spending cap. Configure a provider budget separately. Without a key or available semantic retrieval, local keyword search remains usable. GPU selection affects local OCR, not remote AI calls.

## Validation checklist

Backend tests use the real SDK with mocked network responses to check translation identifiers, embedding ordering, provenance, partial failures, limits, AI-only version replacement, citations and selected-version isolation. Browser tests use mocked explanations and transcriptions. Run them using the [isolated test guide](development.md).

A separate opt-in acceptance check can process a small, permitted document and compare original text, translations, embeddings and cited explanations. This uses the tester's provider account. Synthetic integration checks do not measure answer quality across a complete game library.
