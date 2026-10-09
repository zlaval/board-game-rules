# RuleShelf release

[English](README.md) · [Magyar](README.hu.md)

## Quickstart

Requires Docker with Compose v2 and Linux containers on an **x86-64 / AMD64** computer. Windows users can use Docker Desktop with WSL2. The default worker uses CPU; no GPU, source checkout, Node.js or Python installation is needed.

1. Extract `ruleshelf-0.1.0.zip` into its own folder. The ZIP contains a blank `.env` template. When using this folder from Git, copy `.env.example` to `.env` first (`cp .env.example .env` on Linux/macOS or `Copy-Item .env.example .env` in PowerShell).
2. Edit `.env`: set `POSTGRES_PASSWORD` to your own random password of at least 32 letters/numbers; use only `A-Z`, `a-z`, `0-9`, `_` and `-`. Optionally set **your own** `OPENAI_API_KEY`. Leave the key empty for local keyword search and document extraction.
3. Open a terminal in the extracted folder and start:

```sh
docker compose up -d
```

Open [Rule search](http://localhost:8080) or [Process rulebooks](http://localhost:8080/admin). Docker downloads the versioned public images from Docker Hub. The first PDF/image processing may download additional models. Successfully processed rules are published automatically.

The distributed `.env` contains no API key or working database password. Keep your filled-in file private. The app has no login: everyone who can reach it can manage the library. By default it is accessible only from the Docker host. For a trusted home network, set `APP_BIND_ADDRESS=0.0.0.0`, run `docker compose up -d` again, and use `http://<host-ip>:8080`. Microphone access requires localhost or trusted HTTPS.

## Configuration and data

`.env` is read automatically. Set `APP_PORT` if port 8080 is already in use. OpenAI explanations, translations, semantic search and transcription require your own valid API key and can incur provider charges. Without a key, local rule search and extraction remain available.

Named volumes store the PostgreSQL database (`database`), uploaded/processed files (`documents`) and downloaded models (`models`). They remain after normal shutdown. Preserve `.env` with your data and keep the database password unchanged. Before upgrades, back up PostgreSQL with `pg_dump`, the documents volume and `.env`; model caches can be downloaded again. Keep the same folder and Compose project name when upgrading so the existing volumes are reused.

```sh
# Check services and processing logs
docker compose ps
docker compose logs -f api worker

# Stop while keeping the library
docker compose down

# Start again
docker compose up -d
```

`docker compose down -v` deletes the library and model volumes.

## Updating

After backing up, replace the release files with those from the new ZIP **while preserving your existing `.env`**. Change `RULESHELF_VERSION` in `.env` to the new version, then:

```sh
docker compose pull
docker compose up -d
```

Database migrations run automatically. Version tags select a specific release; changing versions requires updating all three app services together through Compose. Review the new release notes before upgrading.

## Optional NVIDIA GPU

With a supported NVIDIA driver and Docker GPU access (NVIDIA Container Toolkit on Linux):

```sh
docker compose -f compose.yaml -f compose.gpu.yaml up -d
```

This downloads the larger CUDA worker image. Use both files for later Compose commands to retain GPU access. AMD/Intel GPU acceleration is not included.

## Public images

| Component | Version 0.1.0 |
| --- | --- |
| API | `zalerix/ruleshelf-api:0.1.0` |
| Web interface | `zalerix/ruleshelf-frontend:0.1.0` |
| CPU worker (default) | `zalerix/ruleshelf-worker:0.1.0-cpu` |
| NVIDIA worker | `zalerix/ruleshelf-worker:0.1.0-cuda` |

The current images target `linux/amd64`; native ARM64 support is not included in this release. PostgreSQL uses `pgvector/pgvector:pg17`, pinned by digest in Compose.
