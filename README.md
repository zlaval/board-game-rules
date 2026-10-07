# RuleShelf

[English](README.md) · [Magyar](README.hu.md)

## Summary

RuleShelf is a self-hosted board game rulebook library for your home server. Players choose a game and ask about its published rules, with original excerpts and source references alongside the answer. Administrators collect, process, review and publish rule material in a separate interface. It runs locally with Docker Compose and supports English and Hungarian, with English as the default interface language.

## Features

- Responsive player interface for phones, tablets and computers, with game and rulebook selection.
- Local keyword search without an API key; optional OpenAI explanations in the selected interface language, with checked source references.
- Microphone recording and editable speech transcription when OpenAI and a secure browser context are available.
- Open original rule sections and documents; enlarge original figures from cited source pages.
- Create and edit games, editions, descriptions and rulebook language metadata.
- Upload PDF, TXT, Markdown, PNG, JPG and WebP files, or paste text directly.
- Process PDFs and images with Docling and OCR in a separate background worker.
- Prefer an available NVIDIA GPU; automatically use CPU when no usable GPU is available, and retry failed GPU conversion once on CPU.
- Review extracted rule sections with source page numbers, search them by keyword, and inspect original figures.
- Publish reviewed versions. Reprocessing preserves the previous published version until the replacement is approved.
- Switch the entire admin interface, dialogs, validation messages, API errors and processing statuses between English and Hungarian. The browser remembers your choice.
- Keep games, documents and model caches in persistent Docker volumes.
- Protect admin operations and unpublished material with server-side sessions. Published material is readable without an admin login on the configured local address.

## Walkthrough

### Ask about a game

1. Open [the player interface](http://localhost:8080), choose a game and check **Rulebooks in use**. Only published versions can be selected.
2. Type a question. With voice enabled, record up to 60 seconds, stop, then review and edit the recognized text before sending it.
3. Choose **Ask question**. Without an API key, you receive matching original rule sections. With OpenAI configured, you receive an explanation with source buttons, or a visible insufficient-evidence/conflict state.
4. Use **Open source** to review the original excerpt and open its document. PDF sources include a page reference; text sources include a stable section reference. Original figures from those pages can be enlarged.
5. Changing the game or selected rulebooks clears earlier questions. The latest six questions stay in memory until refresh; each question is answered independently, without conversational follow-up context. Answers keep their original language when you switch the interface.

### Manage the library

1. Open [the admin interface](http://localhost:8080/admin), sign in and choose **New game**. Enter the title, edition, rulebook language and optional description.
2. Open the game and choose **Upload rule material**. Select files or use **Paste text**. Markdown headings help organize sections.
3. Leave **Start processing after upload** enabled, or start processing manually later. Progress and failures appear on each document.
4. Choose **Review** when processing finishes. Search the extracted text, check source pages, inspect figures and download the original if needed.
5. Choose **Reviewed — publish** to approve the version. Later, **Reprocess** creates a separate version while the published one remains available.

The language selector is available on the player page, sign-in page, admin header and inside dialogs. Changing interface language does not translate or modify uploaded rulebooks, game names, descriptions or captions. Rulebook language metadata is independent of the interface language.

Current limits: 50 MB per file by default, 100 pages per document, and a 30-minute processing timeout. Multiple uploaded images currently become separate documents. Source references use actual PDF page positions rather than printed page labels. OCR output still needs human review.

The current retrieval uses prefix keyword search and neighboring sections to include nearby examples and exceptions. With AI enabled, small selected rulebooks (up to 40 chunks and 32,000 content/heading characters) are supplied in full; larger ones use bounded search excerpts. Multilingual semantic retrieval, automatic rulebook translation, exact card/figure associations, PWA installation and conversational follow-ups remain planned. The full-text index is active; pgvector is prepared for later semantic search. Large foreign-language books may need questions using their original terminology. Source identifiers are checked, but answer accuracy still needs evaluation on your real rulebooks.

### Components

| Directory | Purpose |
| --- | --- |
| `frontend/` | React, TypeScript and Vite player/admin interfaces; English/Hungarian translation catalogs |
| `backend/app/` | FastAPI API, authentication, OCR processor and PostgreSQL-backed worker |
| `backend/migrations/` | Versioned database migrations |
| `backend/tests/` | Backend integration and processing checks |
| `e2e/` | Chromium checks for the admin flow and language switching |
| `infra/` | Docker Compose, Dockerfiles, Caddy and setup/start scripts |
| `docs/` | Implementation roadmap and validation notes |

## Running the application

### 1. Prerequisites

Run all commands from the project root. You need Docker with the Compose plugin and Linux containers. On Windows, use Docker Desktop with its WSL2 backend. On Proxmox, run Docker inside a Linux VM.

A GPU is optional. NVIDIA acceleration needs a supported driver and Docker GPU access. Linux hosts also need NVIDIA Container Toolkit; a Proxmox VM needs GPU passthrough. The supplied image supports NVIDIA CUDA, not AMD/Intel GPU runtimes. Without working CUDA support, processing uses CPU.

The initial build downloads several GB of CUDA and document-processing dependencies. The first PDF/image conversion may download additional models and therefore needs internet access. Models are cached for later runs. Plain text processing needs no OCR models.

### 2. Start with automatic GPU detection

Windows PowerShell:

```powershell
./infra/start.ps1
```

Linux/Proxmox VM:

```sh
sh infra/start.sh
```

The launcher creates `infra/.env` if needed, builds the images and runs a CUDA operation in a temporary container. A successful probe selects `infra/compose.gpu.yaml`; otherwise it starts the CPU configuration. Existing credentials are preserved.

Open [http://localhost:8080](http://localhost:8080) for players, or [http://localhost:8080/admin](http://localhost:8080/admin) for administrators. The initial admin username is `admin`. Read the generated password from the `ADMIN_PASSWORD` entry in `infra/.env`. Keep this file private and out of version control.

### 3. Configuration

Edit `infra/.env` and run the launcher again to apply changes.

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_BIND_ADDRESS` | `127.0.0.1` | Address exposed on the Docker host |
| `APP_PORT` | `8080` | Host HTTP port |
| `ADMIN_USERNAME` | `admin` | Administrator username |
| `ADMIN_PASSWORD` | Generated | Administrator password; at least 12 characters |
| `POSTGRES_PASSWORD` | Generated | Database password; preserve it with the database volume |
| `COOKIE_SECURE` | `false` | Use `true` when serving the application over HTTPS |
| `MAX_UPLOAD_MB` | `50` | Server upload size limit |
| `MAX_DOCUMENT_PAGES` | `100` | PDF/image conversion page limit |
| `PROCESSING_DEVICE` | `auto` | Prefer usable CUDA; `cpu` forces CPU processing |
| `OPENAI_API_KEY` | Empty | Server-side OpenAI key; empty means local rule search only |
| `OPENAI_ANSWER_MODEL` | `gpt-4.1-mini` | Responses API model supporting structured outputs |
| `OPENAI_TRANSCRIPTION_MODEL` | `gpt-transcribe` | Audio transcription model |

Interface language is a browser preference, initially English. API clients can send `Accept-Language: en` or `Accept-Language: hu`; errors and document processing messages include stable codes as well as localized text. Unsupported language preferences fall back to English.

#### Enable explanations and voice

Set `OPENAI_API_KEY` locally in `infra/.env`. The setup scripts preserve existing files; add the three OpenAI entries from the table if an older file lacks them. Never put the key in frontend configuration. Recreate only the API to apply this configuration:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml up --build --no-deps -d api
```

Refresh the player page. The question and selected excerpts are sent to OpenAI for explanations; recordings are sent for transcription. Requests use `store=false` for generated responses. The app saves neither recordings nor question history in the database. Provider data handling still follows your OpenAI account settings. A valid key, model access and internet connection are required; provider failure falls back to literal rule search.

Question and transcription requests share a limit of 12 per minute per API-visible client address. Behind the bundled proxy, household devices share its address. At most two provider calls run concurrently, with a 45-second timeout and no automatic retry; answer output is limited to 1,800 tokens. These bounds are not a monetary spending cap; configure your provider budget separately.

Microphone capture needs HTTPS or `localhost`, a supported browser and microphone permission. Plain HTTP from a phone to a server IP permits typed questions but not microphone access. Browser recordings stop after 60 seconds; uploads are limited to 10 MB. Review the transcription before sending a question. Real Android/iOS microphone acceptance with trusted local HTTPS remains a deployment check.

### 4. Manual Compose startup

Generate credentials first with `./infra/setup.ps1` or `sh infra/setup.sh` if there is no `.env` yet.

CPU/container without GPU access:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml up --build -d
```

NVIDIA GPU:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml -f infra/compose.gpu.yaml up --build -d
```

The base Compose file does not request GPU devices. Prefer the launchers for automatic detection. When manually recreating a GPU worker, include both Compose files to retain GPU access.

The worker checks CUDA before every PDF/image conversion. GPU mode uses PyTorch for both Docling acceleration and RapidOCR; CPU mode uses ONNX Runtime OCR. GPU conversion failures are retried once on CPU, and a failed CPU attempt is reported normally. Text/Markdown extraction does not use the GPU.

RapidOCR weights are stored in `/models/docling/rapidocr`. Files are verified against registry SHA-256 checksums and saved atomically. Bundled CPU weights are reused without downloading. GPU model downloads request fresh ModelScope CDN links and retry once. Per-job `processing.log` records device selection and fallback errors; `acceleration.json` records the successful device and OCR backend.

### 5. Access from your home network

Set `APP_BIND_ADDRESS=0.0.0.0`, restart with the launcher, and open `http://<server-ip>:8080` from your phone, tablet or computer. Allow the selected port through the host firewall if required.

The current Compose configuration serves HTTP. For a persistent Proxmox deployment, configure internal DNS and trusted HTTPS: replace the `:80` site address in `infra/Caddyfile` with your internal hostname, enable `tls internal`, expose HTTPS in Compose and persist Caddy's `/data` and `/config` directories. Trust Caddy's root certificate on client devices and set `COOKIE_SECURE=true`. This HTTPS deployment is a separate configuration step; it is not enabled by the default launcher.

### 6. Status, updates and shutdown

```sh
# Service status and logs
docker compose --env-file infra/.env -f infra/compose.yaml ps
docker compose --env-file infra/.env -f infra/compose.yaml logs -f api worker

# Stop services while keeping data
docker compose --env-file infra/.env -f infra/compose.yaml down
```

After changing source or configuration, rerun `./infra/start.ps1` or `sh infra/start.sh`. Database migrations run automatically before the API starts.

The `database`, `documents` and `models` volumes survive normal shutdown and rebuilds. `down -v` removes these volumes. Back up the PostgreSQL database, the `documents` volume and `infra/.env` together; model files can be downloaded again. Automated backup and restore procedures are not yet implemented.

### 7. Run checks

Start the application first, then run:

```sh
# Backend tests use a separate temporary database
docker compose --env-file infra/.env -f infra/compose.yaml --profile test run --build --no-deps --rm tests

# Admin/player browser checks: English, Hungarian, desktop, mobile and tablet
docker compose --env-file infra/.env -f infra/compose.yaml --profile e2e run --build --no-deps --rm e2e

# Synthetic PDF/image OCR checks on the active worker
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.smoke_processing
```

Browser screenshots and created test game IDs are written to `test-results/created-game.json` (admin) and `test-results/player-created-games.json` (player). Browser AI answers/transcriptions use test responses and do not spend real provider credits; recording uses Chromium's synthetic microphone. Backend tests exercise the actual OpenAI SDK through a mocked HTTP transport. Browser/OCR checks create games whose names start with `__e2e__`. The OCR check prints its ID as `SMOKE_GAME_ID`. Remove only those test fixtures with their exact IDs:

```powershell
$testGame = (Get-Content test-results/created-game.json | ConvertFrom-Json).id
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.cleanup_e2e $testGame

$playerGames = Get-Content test-results/player-created-games.json | ConvertFrom-Json
foreach ($playerGame in $playerGames) {
    docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.cleanup_e2e $playerGame
}
```

On Linux, read the ID from `test-results/created-game.json` and replace `<test-game-id>` below. Use the printed `SMOKE_GAME_ID` for OCR fixtures:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.cleanup_e2e <test-game-id>
```

The cleanup helper rejects games without the test prefix. Backend tests remove their temporary database after completion.

### 8. Troubleshooting

- **GPU is not selected:** check host drivers and Docker GPU access. The launcher falls back to CPU if its CUDA probe fails. `PROCESSING_DEVICE=cpu` deliberately disables GPU processing.
- **First OCR job is slow:** models may still be downloading. Check the worker and per-job processing logs. Existing cached models are reused.
- **A document fails:** verify its format, size, page count and readability, then retry processing. The previous published version remains available.
- **Sign-in does not work:** check `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `infra/.env`, then restart after any configuration changes.
- **Mobile cannot connect:** check the bind address, server IP and firewall; `127.0.0.1` allows only host-local access.

The API and PostgreSQL are internal services. Caddy serves the frontend and proxies `/api` on the same origin. `/api/play` exposes only published material for household readers; admin endpoints require authentication. Admin cookies are HttpOnly and last 12 hours; session tokens are hashed in the database. The worker claims durable PostgreSQL jobs with renewable leases and fencing tokens, then commits extracted content and completion state atomically.

## Reference documentation

- [FastAPI uploads and errors](https://fastapi.tiangolo.com/tutorial/request-files/)
- [React context](https://react.dev/reference/react/useContext)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI file transcription](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Docling](https://github.com/docling-project/docling)
- [pgvector](https://github.com/pgvector/pgvector)
- [Docker Compose GPU support](https://docs.docker.com/compose/how-tos/gpu-support/)
- [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
