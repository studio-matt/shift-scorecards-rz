# Weekly rollup snapshot v2 — data gaps & decisions

This doc lists narrative or metric blocks that **cannot** be derived from **`/aggregates` (`DailyAggregate`) + org user roster** alone. Per product intent: **do not silently invent** these in code; choose **automate later**, **admin-entered per rollup**, or **omit v1**.

| Item | In aggregates today? | Recommendation |
|------|---------------------|----------------|
| **AI Impact Survey** (baseline vs current confidence, respondent counts, Operator/Architect %, “next goal” % MoM) | No | **Admin-entered per snapshot** or dedicated survey collection + templates later |
| **Long-form editorial** (Copilot features, Satya, Video Recap, Miyamoto quote, closing essay) | No | **Org default copy + optional per-snapshot overrides** in Firestore; render from snapshot doc only |
| **Leaderboard color commentary** (“recovered a lost commission”) | Only if captured in scorecard **win** text and policy allows verbatim display | **Omit v1** unless win fields are wired + consent; else **manual quote** on snapshot |
| **Participation / non-responders** (for email narrative) | Partially (unique participants in aggregates vs roster) | **Future**: extend snapshot builder with roster counts; **v1**: keep existing leadership email path |

**Snapshot v2 scope (implemented):** headline KPIs, period-over-previous-snapshot deltas, monthly + weekly trend buckets from org-level dailies, department/regional table with productivity %, top 50 from user-level aggregates, pull quotes interpolated only from those numbers.
