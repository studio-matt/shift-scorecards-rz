import { NextResponse } from "next/server"

/**
 * Deprecated: executive snapshots use `/api/rollup-snapshots` + `rollup_snapshots` (aggregates-first).
 * Kept so stale tooling references don’t break; clients should migrate.
 */
export async function GET() {
  return NextResponse.json(
    {
      deprecated: true,
      replacement: "/api/rollup-snapshots",
      docs: "/docs/WEEKLY_ROLLUP_V2_GAPS.md",
    },
    { status: 410 },
  )
}

export async function POST() {
  return GET()
}
