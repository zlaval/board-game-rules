# Source builds and isolated tests

For normal installation use the prebuilt images in [the release guide](../release/README.md). Run contributor commands from the repository root. Docker with Linux containers is required. The test overlay requires **Compose 2.24.4 or later** for port replacement with `!override`.

## Build from source

Create `infra/.env` with `./infra/setup.ps1` in PowerShell or `sh infra/setup.sh` on Linux. This generates a database password and preserves existing configuration. Edit that file for your own settings; never commit it.

For a CPU-only build:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml -f infra/compose.cpu.yaml up --build -d
```

For automatic NVIDIA detection use `./infra/start.ps1` or `sh infra/start.sh`. These launchers build the CUDA-capable worker and probe a real CUDA operation before selecting `infra/compose.gpu.yaml`. An unavailable GPU falls back to CPU. The explicit CPU build avoids downloading CUDA dependencies. `PROCESSING_DEVICE=cpu` forces CPU processing in source builds.

The app opens at `http://localhost:8080`. Status, logs and shutdown use the same Compose files as startup. API startup runs database migrations automatically. Source and release deployments use different project names and volumes; switching configurations does not migrate an existing library.

## Separate test environment

`infra/compose.yaml` contains only application services. Test runners live in **`infra/compose.e2e.yaml`**, an explicit overlay never included in the release ZIP. It clears the API/worker OpenAI key and replaces the HTTP port with localhost port `18080` (`E2E_PORT` can override it).

Use the public example environment and a separate project so tests get their own database, files and model volumes:

```sh
docker compose -p ruleshelf-e2e --env-file infra/.env.example -f infra/compose.yaml -f infra/compose.cpu.yaml -f infra/compose.e2e.yaml up --build --wait -d

# Backend integration tests use a separate temporary database.
docker compose -p ruleshelf-e2e --env-file infra/.env.example -f infra/compose.yaml -f infra/compose.cpu.yaml -f infra/compose.e2e.yaml --profile test run --build --rm tests

# Browser tests create synthetic games in this isolated application.
docker compose -p ruleshelf-e2e --env-file infra/.env.example -f infra/compose.yaml -f infra/compose.cpu.yaml -f infra/compose.e2e.yaml --profile e2e run --build --rm e2e
```

The example database password is only for the disposable localhost test stack. Do not use it for an installation. **Keep `-p ruleshelf-e2e` in every test command**, including shutdown. Do not point these tests at an existing library.

Screenshots and fixture IDs go to ignored `test-results/`. Provider answers and transcriptions are mocked; microphone input is synthetic. Backend checks use mocked provider responses. No API key or provider credits are needed. First-time OCR model downloads still need internet access.

The browser image includes a built UI for standalone checks. Other available commands are `npm run test:navigation`, `npm run test:ui` and `npm run test:upload-voice`. For example:

```sh
docker compose -p ruleshelf-e2e --env-file infra/.env.example -f infra/compose.yaml -f infra/compose.cpu.yaml -f infra/compose.e2e.yaml --profile e2e run --build --rm e2e npm run test:upload-voice
```

The test overlay mounts `backend/scripts/` read-only into the isolated worker; these smoke/cleanup helpers are excluded from application images. Synthetic PDF/image OCR checks run on that worker:

```sh
docker compose -p ruleshelf-e2e --env-file infra/.env.example -f infra/compose.yaml -f infra/compose.cpu.yaml -f infra/compose.e2e.yaml exec -T worker python -m scripts.smoke_processing
```

Once finished, delete **only this disposable project's** containers and volumes:

```sh
docker compose -p ruleshelf-e2e --env-file infra/.env.example -f infra/compose.yaml -f infra/compose.cpu.yaml -f infra/compose.e2e.yaml down -v
```

## Check a release before publication

Build with `./infra/publish-release.ps1 -BuildOnly`. The same test overlay works with the image-only release Compose. Use a fresh project and an environment copied from `release/.env.example` into `test-results/release.env`, with a test-only database password and empty OpenAI key. Never reuse an installation's private `.env`.

```sh
docker compose -p ruleshelf-release-test --env-file test-results/release.env -f release/compose.yaml -f infra/compose.e2e.yaml up --pull never --wait -d
docker compose -p ruleshelf-release-test --env-file test-results/release.env -f release/compose.yaml -f infra/compose.e2e.yaml --profile e2e run --build --rm e2e npm run test:release
```

The smoke check requires an empty library, uploads text, waits for the real worker to publish it, and checks search and the original file. It writes `test-results/release-smoke-state.json`. Shut down with `down` (without `-v`), start again, then rerun the test with `run --rm -e VERIFY_PERSISTENCE=1 e2e npm run test:release` to verify persistence. Run browser tests afterwards because they create additional games. Remove the disposable project with `down -v` when finished.

## Static checks

The frontend build (`npm ci` then `npm run build` in `frontend/`) includes TypeScript checking. The backend test image includes Ruff: run the `tests` service with `ruff check app tests`. Validate Compose without starting containers using `config -q`, or list services with `config --services`. The source and release base files must each list exactly `postgres`, `api`, `worker` and `frontend`.
