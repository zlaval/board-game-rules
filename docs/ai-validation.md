# AI rule processing and explanations

Date: 2026-10-08.

## Implementation

- API and worker receive the OpenAI key server-side. The frontend receives only capability flags.
- Uploads store both the rulebook language and usage language (English, Hungarian or both). Extraction produces only the required translations, related topic keywords and 1536-dimensional embeddings. When source and usage language match, no translation request is made; the original rules are still indexed. Existing documents retain their previous bilingual selection. Original text, source references, pages and figures remain unchanged.
- **AI processing** in the administrator creates a new version from existing extracted text and figures, without running OCR. The currently published version remains available until the new version is reviewed and published.
- Preview displays translations separately from original excerpts. AI status distinguishes complete, partial, failed, skipped-by-limit and unprocessed versions.
- Small selected books use complete original context. Larger selected books combine keyword and semantic retrieval, reciprocal rank fusion, contiguous section expansion and bounded page-reference hints. See [retrieval validation](retrieval-validation.md).
- Generated explanations use original excerpts, reference validated source IDs and preserve original page-bound figures. Derived translations and keywords support discovery; they are not supplied as factual source evidence to the answer model.
- Unavailable semantic retrieval falls back to keyword retrieval. Incomplete enrichment retains original extracted rules. Three consecutive failed processing batches stop further requests; configured document limits skip AI processing.

## Verification

- 27 focused backend tests passed against an isolated PostgreSQL database, covering processing, published reader behavior, citations and version isolation. The final nine AI-specific tests were rerun successfully after the last adjustments.
- Tests use the actual OpenAI SDK with mocked HTTP responses. They check translation identifiers, embedding response ordering, original/provenance preservation, partial failure, processing limits, copied figures and AI-only version publication.
- Frontend production build and Ruff checks passed.
- A live synthetic three-section English Markdown rulebook passed extraction, EN/HU translation and embedding using the configured OpenAI account. All three original excerpts remained unchanged, with all translations and vectors present.
- The administrator's AI processing button completed a second version without OCR. The prior published version remained the public source until publication of the new version.
- Live Hungarian and English questions each returned two paragraphs with citations to the relevant original general rule and exception. Source IDs belonged to the selected published version.
- A live Hungarian paraphrase embedding retrieved the original Courier exception first, followed by the general Attack rule.
- Chromium checked the actual admin preview, translations, processing button and cited reader answers in English/Hungarian. Desktop and 390 × 844 mobile checks passed without page errors or horizontal overflow. Screenshots are in ignored `test-results/ai-*.png`.
- The synthetic game, versions, jobs and files were removed by their recorded UUID. Existing household games were not reprocessed or republished.
- API/PostgreSQL are healthy; frontend and worker are running. The worker retains its NVIDIA GPU device reservation. No OCR or PDF processing was run for these checks.
- Answer and processing defaults were changed to `gpt-6-luna`, including the local deployment, Compose, setup templates and both READMEs. Two live in-memory probes passed with this model: EN/HU translation and a Hungarian source-cited explanation. The worker's runtime configuration was verified after recreation with its GPU reservation preserved.
- Focused usage-language checks cover matching source/target languages without translation calls, single-target translation, both targets, regional English source labels, JSON/multipart upload validation, saved preferences and AI-only reprocessing. Translation failure still allows original-text embedding, with a partial status.

## Limits

For the subsequent usage-language, batching and live processing-log changes, see [processing validation](processing-validation.md).

These checks validate the integration and a small factual example, not explanation quality across complete real game libraries. Generated translations need review. Citation validation establishes source membership, not semantic correctness of every claim. Bounded retrieval may miss distant exceptions; original sources remain available for inspection.

Existing books acquire translations and semantic retrieval only after AI processing and publication. Translation, embedding and explanation requests use the configured OpenAI account. GPU selection continues to apply to local OCR, while these AI operations run through the remote API.

Physical phone microphone acceptance and trusted local HTTPS remain separate deployment work. Question history still contains independent questions rather than conversational follow-up context.
