import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import type { ExecutiveReportSchedule, Organization } from "@/lib/types"
import { DEFAULT_EXECUTIVE_REPORT_SCHEDULE } from "@/lib/types"
import {
  computeNextScheduledAt,
} from "@/lib/executive-reports"
import {
  buildRollupSnapshot,
  getLatestRollupSnapshotForOrg,
  saveRollupSnapshot,
} from "@/lib/rollup-snapshots"

const ORGS = "organizations"
const AGGREGATES = "aggregates"

async function orgNameMap(adminDb: ReturnType<typeof getAdminDb>): Promise<Map<string, string>> {
  const snap = await adminDb.collection(ORGS).get()
  const m = new Map<string, string>()
  for (const d of snap.docs) {
    const data = d.data() as { name?: string }
    m.set(d.id, data.name || d.id)
  }
  return m
}

function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  const secretHeader = request.headers.get("X-Backfill-Secret")
  const envSecret = process.env.BACKFILL_SECRET || ""
  return Boolean(envSecret && secretHeader === envSecret)
}

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const url = new URL(request.url)
  const organizationId = url.searchParams.get("organizationId") || null
  const dryRun = url.searchParams.get("dryRun") === "true"

  const adminDb = getAdminDb()
  const orgSnaps = organizationId
    ? [await adminDb.collection(ORGS).doc(organizationId).get()].filter((s) => s.exists)
    : (await adminDb.collection(ORGS).get()).docs

  const now = new Date()
  const names = await orgNameMap(adminDb)

  const results: Array<{ organizationId: string; generated: boolean; reason?: string; reportId?: string }> = []

  for (const snap of orgSnaps) {
    const org = { id: snap.id, ...(snap.data() as Omit<Organization, "id">) } as Organization
    const schedule: ExecutiveReportSchedule =
      (org.executiveReportSchedule as ExecutiveReportSchedule) || DEFAULT_EXECUTIVE_REPORT_SCHEDULE

    if (!schedule.enabled) {
      results.push({ organizationId: org.id, generated: false, reason: "disabled" })
      continue
    }

    const next = schedule.nextScheduledAt || computeNextScheduledAt(schedule, now)
    if (!next) {
      results.push({ organizationId: org.id, generated: false, reason: "no_next_scheduled" })
      continue
    }
    if (new Date(next).getTime() > now.getTime()) {
      results.push({ organizationId: org.id, generated: false, reason: "not_due" })
      continue
    }

    if (dryRun) {
      results.push({ organizationId: org.id, generated: false, reason: "dry_run_due" })
      continue
    }

    const previous = await getLatestRollupSnapshotForOrg(adminDb, org.id)
    const periodStart =
      previous?.period?.endDate ||
      schedule.lastGeneratedAt?.slice(0, 10) ||
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const periodEnd = now.toISOString().slice(0, 10)

    // If aggregates are missing for this org, still write an empty snapshot (keeps cadence consistent).
    // buildRollupSnapshot reads aggregates from adminDb; no extra reads required here.
    const snapshot = await buildRollupSnapshot({
      adminDb,
      organization: { id: org.id, name: org.name, hourlyRate: org.hourlyRate },
      orgNameById: names,
      periodStart,
      periodEnd,
      previous,
    })

    const reportId = await saveRollupSnapshot(adminDb, snapshot)

    const nextScheduledAt = computeNextScheduledAt(
      {
        ...schedule,
        lastGeneratedAt: now.toISOString(),
      },
      now,
    )

    await adminDb.collection(ORGS).doc(org.id).set(
      {
        executiveReportSchedule: {
          ...schedule,
          lastGeneratedAt: now.toISOString(),
          nextScheduledAt,
        },
      },
      { merge: true },
    )

    results.push({ organizationId: org.id, generated: true, reportId })
  }

  return NextResponse.json({
    success: true,
    generated: results.filter((r) => r.generated).length,
    checked: results.length,
    results,
  })
}

