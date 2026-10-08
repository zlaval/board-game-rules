# Processing visibility and usage languages

Date: 2026-10-08.

## Observed bottleneck

The Civilization job was stopped and its game, documents, versions and owned files deleted at the user's request. At inspection it was in AI translation, on its second attempt. Extraction had produced 774 sections containing 104,877 characters. The previous fixed eight-section batching required 97 sequential batches, with translation and embedding calls. About 1,308 seconds had elapsed since job creation; this includes earlier work and the restart and is not a measurement of translation time alone. Restarting the worker repeated AI work rather than continuing a completed batch.

The new implementation packs up to 32 sections and 10,000 source/heading characters per batch. A representative synthetic set of 774 short 135-character fragments produces 25 batches instead of 97. This is a packing check, not a measured speedup for the deleted PDF. Translation now targets only selected languages different from the source; GPT-6 translation calls use reasoning effort `none`. Explanation generation retains its existing settings.

## Visibility

Structured events record extraction device selection, section/character/page/figure counts, AI plan, translation/embedding start and completion, API waits, model names, token usage, durations, failures and result persistence. The admin panel refreshes every two seconds and shows current-step elapsed time and batch/indexed-section counts. It supports EN/HU, job selection and optional scroll following.

The endpoint is scoped to the selected game and returns the five most recent jobs and up to 250 events per job. It never serves raw processing logs, provider response bodies or source rule text. Interrupted attempts are recorded; processing still restarts the AI stage on retry rather than resuming individual batches.

## Checks

- 24 targeted backend checks passed, covering language policy, JSON/multipart validation, AI-only reprocessing, preservation of published versions, batching, durable logs, live progress, game isolation and bounded event tails.
- Frontend TypeScript/Vite build and Ruff checks passed.
- Chromium verified text/file upload preferences, EN/HU switching and 390 × 844 mobile layout without page errors or horizontal overflow.
- A short HU → HU Markdown document processed in 2.04 seconds with actual embeddings and no translation request. Original content remained intact; its AI status was complete and translation fields remained empty.
- Terminal events showed translation skipping and completion in both languages.
- A separate one-section EN → HU live translation with `gpt-6-luna` completed in 2.31 seconds, using 257 input tokens, 66 output tokens and zero reasoning tokens.
- The synthetic game was removed after checks. No OCR or PDF reprocessing was performed. The worker's GPU reservation was preserved.

These initial checks did not measure full rulebook performance. The subsequent real PDF run is recorded below.

## Civilization PDF failure and recovery

The newly created Civilization game contained a Hungarian `civilization.pdf` with Hungarian usage language. Its SHA-256 matched the project-root PDF: `c50b968b6ff1fcb2c571d52df19746352513a3f64d00bb5e5a77964872613432`. No duplicate upload was needed.

The initial job failed during OCR initialization. Docling 2.135.0 imports `PP_OCRV6_LANGS` from RapidOCR's model resolver, but the automatically installed RapidOCR 3.10.0 removed that symbol. GPU conversion failed, then CPU fallback hit the same dependency error. This was not an OpenAI failure or a broken PDF.

RapidOCR is now explicitly pinned to 3.9.2 alongside Docling 2.135.0. The worker image build checks the required language registry, including Hungarian. Extraction also passes the selected source language to Docling's OCR options. The final worker image imports OCR/OpenCV successfully and passes `pip check`; the GPU reservation remains enabled.

Reprocessing the existing document completed successfully:

- Total worker processing: 85.37 seconds.
- Extraction including model loading: 64.30 seconds.
- 30 pages, 95,197 extracted characters, 864 rule sections and 125 original figures.
- GPU `cuda:0`, Torch OCR backend; no CPU fallback.
- 27 embedding batches; all 864 sections have embeddings.
- Hungarian → Hungarian skipped translation entirely; no translation fields were populated and no translation model was called.
- Final state: ready for review, AI complete, no error. Publication remains a separate admin action.

Ten targeted acceleration/model-cache tests and the project-configured Ruff check passed. The failed version is retained for diagnostics; the successful version is the document's current review candidate.
