# Document processing and progress

RuleShelf extracts plain text directly and processes PDFs/images with Docling and OCR in a background worker. The default limits are 200 MB per upload, 100 pages per document and 30 minutes per processing job. Uploaded files and extracted provenance remain available in persistent storage.

## CPU, GPU and models

The release uses CPU processing by default. The optional NVIDIA image enables CUDA when the host supplies a supported GPU and drivers. Source launchers probe an actual CUDA operation before enabling GPU access. A failed GPU conversion is retried once on CPU. AMD/Intel GPU runtimes are not supplied.

Downloaded models are cached in the models volume. Downloads use checksum validation and atomic writes; supported bundled CPU models are reused where available. The worker pins compatible Docling/RapidOCR versions and checks the required OCR language registry at build time. Changing these dependencies requires rechecking both CPU and GPU processing.

## Languages and batches

The source language is passed to OCR. AI processing uses selected usage languages and skips translation when the target matches the source. Original rules are still indexed. Translation batches contain at most 32 sections and 10,000 source/heading characters. Full processing time depends on extraction, document size, model downloads and provider latency; batching counts alone do not establish a speed improvement.

A retry restarts the AI stage rather than resuming completed individual batches. Reprocessing keeps the prior published version available. Successful processing publishes its replacement automatically.

## Progress reporting

The per-game log refreshes every two seconds, supports English/Hungarian and offers the five most recent jobs with up to 250 events per job. It shows device selection, counts, extraction/translation/indexing steps, provider waits, model names, durations, failures and current-step elapsed time.

The endpoint is scoped to the selected game. It does not expose raw provider response bodies or source rule text. Structured events remain with version files until those files are deleted.

## Validation checklist

Run [isolated backend and OCR checks](development.md). Cover language policy, JSON/multipart validation, AI-only reprocessing, published-version preservation, batch limits, durable logs, game isolation, bounded event tails, CUDA probing, CPU forcing, GPU fallback and cache repair.

For OCR acceptance, use permitted representative inputs: text PDF, scanned PDF, image and plain text. Inspect reading order, source language, page references, section text and figure extraction. Test first-run model download separately from cached conversion. Performance measurements should identify input size, device, cache state and provider use; no fixed throughput or latency is guaranteed.
