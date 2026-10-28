# Changelog

## 0.1.1

- Move backend and browser test runners to `infra/compose.e2e.yaml`; deployment Compose files contain only application services.
- Exclude OCR smoke/cleanup helpers from the published worker; mount them only through the test overlay.
- Provide an isolated test project with no OpenAI key and a separate localhost port.
- Document installation, development, testing and Proxmox deployment without details of an individual installation.
- Apply the 200 MB upload default consistently to the release API and frontend proxy, and show the configured limit in the upload dialog.
- Report microphone availability and browser errors without an application-level HTTPS gate; browser permissions and secure-context restrictions still apply.

## 0.1.0

- Initial prebuilt `linux/amd64` release with API, web interface, CPU worker and NVIDIA CUDA worker.
- English/Hungarian rulebook management and search, persistent processing and optional OpenAI features.
