#!/usr/bin/env sh
# One-off POST to aggregate responses (seeds / updates `aggregates`).
# Usage:
#   export BASE_URL="https://your-deployment.vercel.app"
#   export BACKFILL_SECRET="your-secret"   # must match BACKFILL_SECRET in Vercel / .env
#   ./scripts/trigger-cron-aggregate.sh
#
# Or with Vercel cron auth:
#   curl -X POST "${BASE_URL}/api/cron/aggregate-responses" \
#     -H "Authorization: Bearer ${CRON_SECRET}"

set -eu
BASE_URL="${BASE_URL:-}"
SECRET="${BACKFILL_SECRET:-}"

if [ -z "$BASE_URL" ] || [ -z "$SECRET" ]; then
  echo "Set BASE_URL and BACKFILL_SECRET first." >&2
  exit 1
fi

curl -sS -X POST "${BASE_URL%/}/api/cron/aggregate-responses" \
  -H "X-Backfill-Secret: ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
echo ""
