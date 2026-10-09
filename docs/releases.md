# Publishing RuleShelf releases

The user-facing package lives in `release/`. It uses public, versioned Docker Hub images and needs no source build. The release currently targets `linux/amd64`.

## Create a new version

1. Set the same semantic version in `release/VERSION`, `release/.env.example`, the defaults in both release Compose files, and the quickstarts/image tables in both root and release READMEs. Keep all application image versions together. Document notable changes.
2. Authenticate with `docker login` or Docker Desktop to the `zalerix` account (or an authorized organization). Never add credentials to the repository or a build argument.
3. Build locally from the repository root with PowerShell (PowerShell 7 also works on Linux):

```powershell
./infra/publish-release.ps1 -BuildOnly
```

This builds the API, frontend, CPU worker and CUDA worker with version/source/revision OCI labels. `.dockerignore` excludes `.env` files, virtual environments, release bundles and test outputs. The image build only copies the application source and dependency manifests.

4. Test the packaged Compose configuration using an isolated project, port and fresh volumes, with an empty OpenAI key. Verify startup/migrations, upload and processing, automatic publication, rule search, shutdown/restart persistence and the player/admin interfaces. Check that the images contain no `.env` files or private API keys before publication.
5. Publish the tested images:

```powershell
./infra/publish-release.ps1 -PushOnly
```

The publisher checks all selected remote tags and refuses to overwrite an existing release. It does not push a `latest` tag. For a partial push failure, inspect the already-published image digests and push only the missing components, for example `./infra/publish-release.ps1 -PushOnly -Components cuda`. Available components are `api`, `frontend`, `cpu` and `cuda`. Do not rebuild and overwrite the same release.

6. Check the tags anonymously using a Docker client with an empty credential configuration. Extract the ZIP into an empty folder, fill in `.env`, and verify `docker compose up -d` using the public images.

The generated `release/ruleshelf-<version>.zip` and `.zip.sha256` can be shared directly or attached to a repository release. The ZIP uses an explicit allowlist and creates its `.env` from `.env.example`, never from a user's existing `.env`. Database passwords and API keys in the distributed template are always blank. The ZIP includes both READMEs, both Compose files, `.env.example`, `.env` and `VERSION`.

To regenerate only the package:

```powershell
./infra/package-release.ps1
```

No Docker Hub login is required for end users to pull public images. Keep release tags immutable in Docker Hub repository settings as well. Native ARM64 image builds remain a separate release enhancement; do not advertise them until both OCR dependencies and processing have been tested on that architecture.
