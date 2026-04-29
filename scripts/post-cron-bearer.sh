#!/usr/bin/env sh
# POST /api/cron/aggregate-responses with Vercel-style cron auth.
# Matches verifyAuth in app/api/cron/aggregate-responses/route.ts (Authorization: Bearer CRON_SECRET).
#
# Usage:
#   export CRON_SECRET="<same string as Firebase App Hosting → Backend → Environment>"
#   export BASE_URL="${BASE_URL:-https://scorecard.envoydesign.com}"
#   ./scripts/post-cron-bearer.sh
#
# Expect HTTP 200 when CRON_SECRET matches App Hosting; 403 otherwise.

set -eu
BASE_URL="${BASE_URL:-https://scorecard.envoydesign.com}"
CRON_SECRET="${CRON_SECRET:-}"

if [ -z "$CRON_SECRET" ]; then
  echo "Set CRON_SECRET to the App Hosting CRON_SECRET value." >&2
  exit 1
fi

url="${BASE_URL%/}/api/cron/aggregate-responses"
body_file="$(mktemp)"
cleanup() {
  rm -f "$body_file"
}
trap cleanup EXIT INT TERM

code="$(curl -sS -o "$body_file" -w "%{http_code}" -X POST "$url" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}')"
printf '%s HTTP %s\n' "$url" "$code"
head -c 2000 "$body_file" 2>/dev/null || cat "$body_file"
printf '\n'

case "$code" in
  200) exit 0 ;;
  *) exit 1 ;;
esac
