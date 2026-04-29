#!/usr/bin/env sh
# One-off POST to aggregate responses (seeds / updates `aggregates`).
# Usage:
#   export BASE_URL="https://scorecard.envoydesign.com"
#   export BACKFILL_SECRET="your-secret"   # must match App Hosting BACKFILL_SECRET
#   ./scripts/trigger-cron-aggregate.sh
#
# Bearer style (matches Cloud Scheduler + verifyAuth primary branch):
#   export CRON_SECRET="..." ; ./scripts/post-cron-bearer.sh

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
