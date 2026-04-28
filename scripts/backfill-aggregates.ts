/**
 * Backfill Aggregates Script
 * 
 * One-time script to process all historical responses into aggregates.
 * Run this ONCE after deploying the aggregation system.
 * 
 * Usage:
 *   curl -X POST "https://scorecard.envoydesign.com/api/cron/aggregate-responses?full=true" \
 *     -H "X-Backfill-Secret: shift-backfill-2026"
 * 
 * The ?full=true parameter tells the endpoint to process ALL responses,
 * not just those since the last run.
 * 
 * This can take several minutes for 35K+ responses. The endpoint will
 * return when complete with a summary of processed responses.
 */

console.log(`
=== BACKFILL AGGREGATES ===

This is a documentation file. To run the backfill:

1. Deploy the cron endpoint first (merge PR)

2. Run the backfill via curl:

   curl -X POST "https://scorecard.envoydesign.com/api/cron/aggregate-responses?full=true" \\
     -H "X-Backfill-Secret: shift-backfill-2026"

3. Wait for completion (may take 2-5 minutes for 35K responses)

4. Verify aggregates in Firebase Console:
   - Go to Firestore → aggregates collection
   - Should see documents like "2026-04-28_all_all_all"

5. The hourly cron will handle new responses going forward

=== OPTIONS ===

- ?full=true     Process ALL responses (ignore lastRunAt)
- ?date=2026-04-28  Only process responses for a specific date

=== VERIFICATION ===

After backfill, check aggregates match raw data:

1. Count responses in Firebase:
   - Firestore → responses collection → document count

2. Check aggregate totals:
   - Firestore → aggregates collection
   - Find "2026-04-28_all_all_all" (or any recent date)
   - responseCount should match daily submissions

`)
