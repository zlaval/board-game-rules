# Administration

The library manager is available at `/admin`. The shared header switches between player and administrator views. There is no authentication; anyone who can reach the application can modify the library. Use a trusted network or configure access control in your reverse proxy.

## Workflow

1. Create or edit a game, edition, language and description.
2. Upload PDF, TXT, Markdown, PNG, JPG or WebP files, or paste text. The dialog reads the configured upload limit from the API; the default is 200 MB per file.
3. Choose the source language and usage languages. Matching source/usage languages skip translation.
4. Start processing automatically after upload, or start it later. Follow the per-game processing log and open extracted rules or original figures.
5. Successful processing publishes the new version automatically. Reprocessing and **Update translation and search** keep the previous published version available until a successful replacement is ready.

The interface supports English and Hungarian and remembers the browser's language selection. Language changes preserve form contents and do not translate uploaded rulebooks or game metadata. API clients can use `Accept-Language: en` or `hu` for localized errors with stable error codes.

## Data and processing

Original uploads, extracted text, figures and versions retain their provenance. A separate worker claims durable PostgreSQL jobs using renewable leases and fencing tokens. The worker saves processed content and completion state atomically. Database, document and model volumes persist across normal shutdown.

Multiple uploaded images become separate documents. PDF references use actual page positions. Manual editing of extracted text, translations or figure crops is not currently available. OCR results need review for each document.

## Validation checklist

Run the [isolated test environment](development.md), not an existing library. Backend tests cover game changes, origin checks, file limits, duplicate detection, language validation, job leases, version replacement, source access and localized errors. Browser checks exercise uploads, processing, source previews, automatic publication, navigation and English/Hungarian layouts.

`npm run test:upload-voice` also checks the configured upload limit, a file exactly at 200 MB, rejection above the limit and a different configured limit. Test provider responses are mocked. Test results describe the tested revision and environment; they do not establish OCR quality for arbitrary rulebooks.
