#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ -f .env ]; then
  echo 'infra/.env already exists; existing configuration was preserved.'
  exit 0
fi
umask 077
database_secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
cat > .env <<EOF
APP_BIND_ADDRESS=127.0.0.1
APP_PORT=8080
POSTGRES_PASSWORD=$database_secret
MAX_UPLOAD_MB=50
MAX_DOCUMENT_PAGES=100
PROCESSING_DEVICE=auto
OPENAI_API_KEY=
OPENAI_ANSWER_MODEL=gpt-6-luna
OPENAI_PROCESSING_MODEL=gpt-6-luna
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
AI_PROCESSING_ENABLED=true
AI_MAX_CHUNKS=2000
AI_MAX_CHARACTERS=600000
OPENAI_TRANSCRIPTION_MODEL=gpt-transcribe
EOF
echo 'Created infra/.env with a generated database password. Admin access does not require a login.'

