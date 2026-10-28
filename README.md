# RuleShelf

[English](README.md) · [Magyar](README.hu.md)

RuleShelf is a self-hosted board game rulebook library. Upload rulebooks, choose a game and ask about its rules. Answers include original excerpts, page references and related figures. The player and library management interfaces support English and Hungarian.

## Quickstart

Requires Docker with Compose v2 and Linux containers on an **x86-64 / AMD64** computer. Windows users can use Docker Desktop with WSL2. The default worker uses CPU; a GPU and a source build are optional.

Clone this repository, then open its release folder:

```sh
git clone https://github.com/zlaval/board-game-rules.git
cd board-game-rules/release
cp .env.example .env
```

In PowerShell, use `Copy-Item .env.example .env` for the last step. Alternatively, extract the release ZIP, which already includes a blank `.env` template.

1. Edit `.env` and set `POSTGRES_PASSWORD` to a random password of at least 32 characters, using only letters, numbers, `_` and `-`.
2. Optionally set your own `OPENAI_API_KEY`. Leave it empty for local keyword search and document extraction.
3. Start the application:

```sh
docker compose up -d
```

Open [Rule search](http://localhost:8080) or [Process rulebooks](http://localhost:8080/admin). Compose downloads version **0.1.1** from [Docker Hub](https://hub.docker.com/u/zalerix). The release runs only PostgreSQL, API, worker and frontend services. Test tools are supplied separately in the source repository.

The app has no login. Everyone who can reach it can manage the library. It binds to localhost by default; for a trusted home network, set `APP_BIND_ADDRESS=0.0.0.0` and restart Compose. Use `http://<server-ip>:8080` from another device. Microphone recording normally requires localhost or trusted HTTPS and browser permission.

## Using the library

1. In **Process rulebooks**, create a game with its edition, language and optional description.
2. Choose **Upload rule material** to upload PDF, TXT, Markdown, PNG, JPG or WebP files, or paste text. Set the rulebook language and desired usage languages.
3. Follow the processing log. Successful processing publishes the rules automatically.
4. In **Rule search**, select the game and rulebooks, then type a question. With voice enabled, record up to 60 seconds and review the transcription before sending it.
5. Open the answer's sources to inspect original text, documents and figures. Reprocessing keeps the previously published version available until its replacement succeeds.

Without an API key, search returns matching original rule sections. OpenAI adds explanations, translations, semantic search and transcription. The key stays on the server. These features send relevant text, questions or recordings to OpenAI and can incur provider charges. Recordings and question history are not stored in the database; the browser keeps the last six independent questions until refresh.

Default limits are **200 MB per file**, **100 pages per document** and a **30-minute processing timeout**. Multiple uploaded images become separate documents. OCR and AI output need review; source membership checks do not guarantee that every explanation is correct. Page references use actual PDF page positions. Conversational follow-ups, PWA installation and manual editing of extracted content are not currently supported.

## Configuration and operation

Edit `release/.env`, then run `docker compose up -d` in `release/` to apply changes.

| Variable | Default | Purpose |
| --- | --- | --- |
| `RULESHELF_VERSION` | `0.1.1` | Version shared by all application images |
| `APP_BIND_ADDRESS` | `127.0.0.1` | Host address exposed by the frontend |
| `APP_PORT` | `8080` | Host HTTP port |
| `POSTGRES_PASSWORD` | Required | Database password; preserve it with the database volume |
| `MAX_UPLOAD_MB` | `200` | Upload limit used by the API and frontend proxy |
| `MAX_DOCUMENT_PAGES` | `100` | PDF/image conversion page limit |
| `OPENAI_API_KEY` | Empty | Optional server-side OpenAI key |
| `OPENAI_ANSWER_MODEL` | `gpt-6-luna` | Explanation model |
| `OPENAI_PROCESSING_MODEL` | `gpt-6-luna` | Translation and search keyword model |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Search embedding model, 1536 dimensions |
| `OPENAI_TRANSCRIPTION_MODEL` | `gpt-transcribe` | Audio transcription model |
| `AI_PROCESSING_ENABLED` | `true` | Enrich rules when an API key is available |
| `AI_MAX_CHUNKS` | `2000` | Maximum sections per AI processing job |
| `AI_MAX_CHARACTERS` | `600000` | Maximum original characters per AI processing job |

```sh
docker compose ps
docker compose logs -f api worker
docker compose down
```

The `database`, `documents` and `models` volumes survive normal shutdown. Back up PostgreSQL, the documents volume and your private `.env` together. `docker compose down -v` deletes the volumes and library.

For NVIDIA acceleration, use both release Compose files:

```sh
docker compose -f compose.yaml -f compose.gpu.yaml up -d
```

This needs a supported NVIDIA driver and Docker GPU access, including NVIDIA Container Toolkit on Linux. AMD/Intel GPU acceleration and native ARM64 images are not included. First PDF/image processing may download additional models, which are cached in the models volume.

For upgrades, preserve `.env`, replace the release files, set `RULESHELF_VERSION` to the new version, then run `docker compose pull` and `docker compose up -d`. Keep the same installation folder and project name so existing volumes are reused. Include the GPU file in all commands if enabled. Database migrations run automatically.

## Documentation

- [Deployment, updates and image tags](release/README.md)
- [Build from source and run isolated tests](docs/development.md)
- [Proxmox VM deployment](infra/proxmox/README.md)
- [Release publishing](docs/releases.md) and [changelog](docs/changelog.md)
- [Administration](docs/admin-validation.md), [player behavior](docs/player-validation.md), [AI](docs/ai-validation.md), [processing](docs/processing-validation.md) and [retrieval](docs/retrieval-validation.md)
- [Architecture and roadmap](docs/implementation-plan.md)

## Repository layout

| Directory | Purpose |
| --- | --- |
| `frontend/` | React/TypeScript/Vite interfaces and translation catalogs |
| `backend/app/` | FastAPI API, document processing and background worker |
| `backend/migrations/` | Database migrations |
| `backend/tests/` | Backend integration and processing tests |
| `e2e/` | Browser and release smoke checks |
| `infra/` | Source builds, separate test Compose, setup and publishing scripts |
| `release/` | Deployment Compose and templates for prebuilt public images |
| `docs/` | General user, contributor and maintainer documentation |
