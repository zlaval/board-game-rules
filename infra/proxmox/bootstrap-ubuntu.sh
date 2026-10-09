#!/bin/sh
# Run as root INSIDE the new application VM, never on the Proxmox host.
set -eu

if [ "$(id -u)" -ne 0 ]; then
    echo 'Run this script with sudo inside the application VM.' >&2
    exit 1
fi

. /etc/os-release
if [ "$ID" != ubuntu ] || [ "$VERSION_ID" != 24.04 ]; then
    echo 'This bootstrap is intended for Ubuntu Server 24.04 LTS.' >&2
    exit 1
fi
if command -v pveversion >/dev/null 2>&1; then
    echo 'Refusing to install Docker on the Proxmox host.' >&2
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl qemu-guest-agent rsync
install -m 0755 -d /etc/apt/keyrings
curl --fail --silent --show-error --location \
    https://download.docker.com/linux/ubuntu/gpg \
    --output /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
# The guest agent is activated by its virtio device; it is a static unit.
systemctl start qemu-guest-agent
timedatectl set-timezone Europe/Budapest
install -d -m 0755 /opt/ruleshelf
docker version --format '{{.Server.Version}}'
docker compose version
echo 'Docker and guest agent installed. Application directory: /opt/ruleshelf'
