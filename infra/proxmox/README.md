# Proxmox deployment

[English](README.md) · [Magyar](README.hu.md)

Deploy RuleShelf inside a dedicated Ubuntu Server 24.04 LTS VM. Install Docker
inside the VM; do not install it on the Proxmox host.

## Before creating the VM

Inspect node resources, existing VM IDs, active storage, network bridges and GPU
assignments. A starting allocation is 4 vCPUs, 4 GiB RAM and an 80 GiB disk,
subject to available host capacity. Use a free VM ID and an existing LAN bridge.
Use SSH keys for the Ubuntu user and enable QEMU Guest Agent and boot on host
startup. Start with DHCP; reserve the assigned address in the home router.

For cloud-image provisioning, download an official Ubuntu cloud image, verify
its checksum, import its disk with the VirtIO SCSI controller, attach a
Cloud-Init drive and set the SSH key and network configuration. Preserve all
existing virtual machines and their device assignments.

## Inside the application VM

Copy the project to `/opt/ruleshelf`. Exclude `.git`, `node_modules`, generated
test artifacts and `.env` from the source archive. Generate a fresh
configuration with `sudo sh infra/setup.sh`, keep it private with `chmod 600`, and set
`APP_BIND_ADDRESS=0.0.0.0` for access from the home LAN.

Run this bootstrap **inside the Ubuntu VM**:

```sh
sudo sh /opt/ruleshelf/infra/proxmox/bootstrap-ubuntu.sh
cd /opt/ruleshelf
sudo sh infra/start.sh
```

The bootstrap installs Docker Engine, Buildx, Compose and QEMU Guest Agent
using Docker's official Ubuntu repository. The existing application launcher
detects usable Docker GPU access and otherwise selects CPU processing.

For a dedicated CPU host, use `sudo sh infra/proxmox/start-cpu.sh` instead.
It includes `infra/compose.cpu.yaml` to build CPU PyTorch wheels, avoiding
unused CUDA dependencies, and forces CPU processing. Do not combine this
override with `compose.gpu.yaml`. The default GPU-capable build is unchanged.

GPU processing requires a GPU available for passthrough, working guest NVIDIA
drivers and NVIDIA Container Toolkit. Inspect host assignments first; do not
take a device away from an existing VM or change host IOMMU settings as part
of a routine application deployment.

## Existing application data

When moving the existing library, back up PostgreSQL and the documents volume
together while application writes and background jobs are stopped. Preserve
`infra/.env` with the database credentials for backups. A logical `pg_dump`
restore into a new database can use that VM's newly generated password.
Transfer the OpenAI key separately over SSH when authorized, without printing
it; `set-openai-key.py` accepts one `OPENAI_API_KEY=` assignment on stdin and
atomically updates `/opt/ruleshelf/infra/.env` with root-only permissions.
Restore only into the new VM's
empty volumes before starting the API and worker. The models volume is a
download cache and can optionally be transferred to avoid first-run downloads.
Keep the source instance's data intact until the new instance is verified.

## Verify

```sh
cd /opt/ruleshelf
sudo docker compose --env-file infra/.env -f infra/compose.yaml ps
curl --fail http://127.0.0.1:8080/api/health
```

Open `http://<vm-ip>:8080` and `http://<vm-ip>:8080/admin` from the LAN.
Check player/admin navigation and, when data was transferred, the published
library. Verification does not require running OCR or making paid AI calls.

The default deployment serves HTTP. Mobile microphone access requires a
separate trusted HTTPS configuration; see the main README. Admin access has
no login and the service is intended for the home LAN.

## Home server installation

| Setting | Value |
| --- | --- |
| Proxmox node | `pve`, `192.168.1.100`, Proxmox VE 9.1.1 |
| VM | `103`, `ruleshelf`, starts with the Proxmox host |
| Guest | Ubuntu Server 24.04 LTS, user `ubuntu` (SSH key, sudo) |
| Resources | 4 vCPUs, 4 GiB RAM, 80 GiB disk, 2 GiB swap |
| Storage / bridge | `local-lvm` / `vmbr0` |
| LAN address | DHCP: `192.168.1.80` |
| MAC for DHCP reservation | `BC:24:11:26:D6:EE` |
| Application | `/opt/ruleshelf`, HTTP port `8080` |
| Worker | CPU; the host has Intel UHD 620, no supported NVIDIA GPU |
| Timezone | `Europe/Budapest` |

Reserve the MAC address in the router to keep `192.168.1.80` stable.
Application updates on this VM use the CPU launcher:

```sh
ssh ubuntu@192.168.1.80
cd /opt/ruleshelf
sudo sh infra/proxmox/start-cpu.sh
sudo docker compose --env-file infra/.env -f infra/compose.yaml -f infra/compose.cpu.yaml ps
```

Docker starts at guest boot and application containers use `unless-stopped`.
For shutdown, use the same Compose files with `down`, without `-v` to retain data.

## References

- [Proxmox Cloud-Init](https://pve.proxmox.com/wiki/Cloud-Init_Support)
- [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Application configuration](../../README.md)
