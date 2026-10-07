#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
sh infra/setup.sh
set -- docker compose --env-file infra/.env -f infra/compose.yaml
"$@" build
if docker run --rm --gpus all --entrypoint python board-game-rules-worker -m app.acceleration; then
    echo 'CUDA available: enabling GPU worker with CPU fallback.'
    set -- "$@" -f infra/compose.gpu.yaml
else
    echo 'CUDA unavailable in Docker: using CPU worker.'
fi
"$@" up -d
