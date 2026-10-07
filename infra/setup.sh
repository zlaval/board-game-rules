#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ -f .env ]; then
  echo 'infra/.env already exists; existing credentials were preserved.'
  exit 0
fi
umask 077
admin_secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
database_secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
cat > .env <<EOF
APP_BIND_ADDRESS=127.0.0.1
APP_PORT=8080
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$admin_secret
POSTGRES_PASSWORD=$database_secret
COOKIE_SECURE=false
MAX_UPLOAD_MB=50
MAX_DOCUMENT_PAGES=100
EOF
echo 'Created infra/.env with generated credentials. Admin username: admin. Read ADMIN_PASSWORD locally from this file.'

