#!/usr/bin/env sh
# Set Cloud Scheduler HTTP job headers so Authorization matches App Hosting CRON_SECRET.
# Run locally with gcloud authenticated (same project as the job).
#
# Usage:
#   export GCP_PROJECT=shift-fe6e9
#   export GCP_REGION=us-central1       # REQUIRED: must match the job region in GCP Console → Cloud Scheduler (not App Hosting)
#   export SCHEDULER_JOB=ShiftAggregator
#   export CRON_SECRET="<exact App Hosting Backend → CRON_SECRET>"
#   ./scripts/gcloud-scheduler-set-cron-bearer.sh
#
# Rotation (same secret everywhere after a change):
#   1) New value in Firebase App Hosting → Backend → Environment → CRON_SECRET → Save/redeploy if needed.
#   2) Run this script with the same CRON_SECRET value.
#   3) Update local `.env.local` / CI secrets used for manual Bearer tests.
#
# Re-test: Cloud Scheduler → job → FORCE RUN — should not show HTTP 403 on the App Hosting logs.

set -eu
PROJECT="${GCP_PROJECT:-shift-fe6e9}"
LOCATION="${GCP_REGION:-us-central1}"
JOB="${SCHEDULER_JOB:-ShiftAggregator}"
CRON_SECRET="${CRON_SECRET:-}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI not found. Install Google Cloud SDK, then rerun." >&2
  exit 1
fi
if [ -z "$CRON_SECRET" ]; then
  echo "Set CRON_SECRET (must match App Hosting). Optional: GCP_REGION (defaults to ${LOCATION}) if job is in another region." >&2
  exit 1
fi

echo "Using region=${LOCATION}, project=${PROJECT}, job=${JOB}" >&2
gcloud scheduler jobs update http "$JOB" \
  --project="$PROJECT" \
  --location="$LOCATION" \
  --update-headers="Authorization=Bearer ${CRON_SECRET}"

echo "Updated job ${JOB}. Use Cloud Scheduler → FORCE RUN to verify (expect no 403 from the route)."
