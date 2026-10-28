# Proxmox deployment

[English](README.md) · [Magyar](README.hu.md)

Run RuleShelf inside a dedicated Ubuntu Server 24.04 LTS VM. Install Docker inside the VM. The following paths and resource sizes are examples; choose values appropriate to your host.

## Prepare the VM

Check available CPU, memory, storage, network bridges and VM IDs. A starting allocation is 4 vCPUs, 4 GiB RAM and an 80 GiB disk; OCR requirements depend on document size. Use a free VM ID, an existing LAN bridge, SSH keys and QEMU Guest Agent. Enable startup with the host if desired and reserve the VM's DHCP address in your router.

For cloud-image installation, download an official Ubuntu image, verify its checksum, import its disk and configure a Cloud-Init drive with your SSH key and network settings. GPU acceleration additionally requires PCI passthrough, guest NVIDIA drivers and NVIDIA Container Toolkit. CPU processing requires no GPU configuration.

## Install prebuilt images

Clone the repository into a directory of your choice, such as `/opt/ruleshelf`. Run the bootstrap **inside the Ubuntu VM**:

```sh
sudo sh /opt/ruleshelf/infra/proxmox/bootstrap-ubuntu.sh
cd /opt/ruleshelf/release
sudo cp .env.example .env
sudo chmod 600 .env
sudoedit .env
```

Set your own `POSTGRES_PASSWORD`, optionally `OPENAI_API_KEY`, and `APP_BIND_ADDRESS=0.0.0.0` for trusted LAN access. Then:

```sh
sudo docker compose up -d
sudo docker compose ps
curl --fail http://127.0.0.1:8080/api/health
```

The bootstrap installs Docker Engine, Buildx, Compose and QEMU Guest Agent using Docker's official Ubuntu repository. The release downloads prebuilt CPU images and contains no test services. See [the release guide](../../release/README.md) for the optional GPU configuration and updates.

Open `http://<vm-ip>:8080` and `http://<vm-ip>:8080/admin`. There is no login, so use a trusted network. For phone microphone access, place the application behind a reverse proxy with a certificate trusted by the phone. The default Compose serves HTTP.

## Source builds

For contributors, `sudo sh infra/proxmox/start-cpu.sh` from the repository root builds CPU-only dependencies. `sudo sh infra/start.sh` builds a CUDA-capable worker and detects available GPU access. These use `infra/.env` and a different Compose project from the release. See [development and tests](../../docs/development.md); switching configurations does not transfer data.

## Data and maintenance

Back up PostgreSQL, the documents volume and the private configuration together. Stop API writes and background jobs while taking a consistent migration backup. Model caches can be transferred or downloaded again. Restore into empty destination volumes before starting API and worker, and retain the original backup until verification succeeds.

Keep the same installation directory and project name for upgrades. Preserve `.env`, update the release files and `RULESHELF_VERSION`, then run `sudo docker compose pull` and `sudo docker compose up -d` from the release directory. Include `-f compose.yaml -f compose.gpu.yaml` when using NVIDIA.

Docker starts on VM boot and the application containers use `unless-stopped`. `sudo docker compose down` stops the application while retaining volumes. `down -v` deletes the stored library. Check service status, player/admin navigation and the published library after deployment or restore.

## References

- [Proxmox Cloud-Init](https://pve.proxmox.com/wiki/Cloud-Init_Support)
- [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Application configuration](../../README.md)
