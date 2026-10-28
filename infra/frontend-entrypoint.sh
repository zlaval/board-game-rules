#!/bin/sh
set -eu
upload_mb=${MAX_UPLOAD_MB:-200}
case "$upload_mb" in
    ''|*[!0-9]*) printf '%s\n' 'MAX_UPLOAD_MB must be a positive integer.' >&2; exit 1 ;;
esac
test "$upload_mb" -gt 0
# Leave room for multipart headers in addition to the file itself.
export MAX_REQUEST_BODY_BYTES=$(((upload_mb + 2) * 1024 * 1024))
exec "$@"
