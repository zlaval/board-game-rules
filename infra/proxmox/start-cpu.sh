#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
sh infra/setup.sh
docker compose --env-file infra/.env -f infra/compose.yaml -f infra/compose.cpu.yaml \
    up --build --wait --wait-timeout 180 -d
