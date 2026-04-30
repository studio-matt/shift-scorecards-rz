import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { verifyCallerIsAdmin } from "@/lib/verify-admin-request"
import type { ExecutiveReportSchedule, Organization } from "@/lib/types"
import { DEFAULT_EXECUTIVE_REPORT_SCHEDULE } from "@/lib/types"
import {
  computeNextScheduledAt,
  generateExecutiveReportSnapshot,
  getLatestExecutiveReportForOrg,
  saveExecutiveReportSnapshot,
} from "@/lib/executive-reports"

const ORGS = "organizations"
const RESPONSES = "responses"

function clampLookbackStart(now: Date, fallbackDays = 14): string {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() - fallbackDays)
  return d.toISOString()
}

export async function GET(request: NextRequest) {
  const auth = await verifyCallerIsAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const url = new URL(request.url)
  const orgId = url.searchParams.get("organizationId") || auth.organizationId
  if (!orgId) return NextResponse.json({ error: "Missing organizationId" }, { status: 400 })

  const adminDb = getAdminDb()
  const latest = await getLatestExecutiveReportForOrg(adminDb, orgId)
  return NextResponse.json({ latest })
}

export async function POST(request: NextRequest) {
  const auth = await verifyCallerIsAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json().catch(() => ({}))) as {
    organizationId?: string
    periodStartInclusive?: string
    periodEndExclusive?: string
  }

  const orgId = body.organizationId || auth.organizationId
  if (!orgId) return NextResponse.json({ error: "Missing organizationId" }, { status: 400 })

  const adminDb = getAdminDb()
  const orgSnap = await adminDb.collection(ORGS).doc(orgId).get()
  if (!orgSnap.exists) return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  const org = { id: orgSnap.id, ...(orgSnap.data() as Omit<Organization, "id">) } as Organization

  const schedule: ExecutiveReportSchedule =
    (org.executiveReportSchedule as ExecutiveReportSchedule) || DEFAULT_EXECUTIVE_REPORT_SCHEDULE

  const now = new Date()
  const latest = await getLatestExecutiveReportForOrg(adminDb, orgId)
  const startInclusive =
    body.periodStartInclusive ||
    latest?.period?.endExclusive ||
    schedule.lastGeneratedAt ||
    clampLookbackStart(now, 14)
  const endExclusive = body.periodEndExclusive || now.toISOString()

  // Pull responses for the org in the window + a bit of history for trend/deltas.
  // Trend wants recent months; pull 180d back from end.
  const min = new Date(endExclusive)
  min.setUTCDate(min.getUTCDate() - 200)
  const minIso = min.toISOString()

  const respSnap = await adminDb
    .collection(RESPONSES)
    .where("organizationId", "==", orgId)
    .where("completedAt", ">=", minIso)
    .where("completedAt", "<", endExclusive)
    .get()
  const responses = respSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown as any[]

  const snapshot = await generateExecutiveReportSnapshot({
    adminDb,
    organization: {
      id: org.id,
      name: org.name,
      departments: org.departments || [],
      hourlyRate: org.hourlyRate,
    },
    responses,
    period: { startInclusive, endExclusive },
    generatedAt: now,
  })

  const id = await saveExecutiveReportSnapshot(adminDb, snapshot)

  // Update schedule pointers on org doc
  const nextScheduledAt = computeNextScheduledAt(
    {
      ...schedule,
      enabled: schedule.enabled ?? false,
      lastGeneratedAt: now.toISOString(),
    },
    now,
  )

  await adminDb.collection(ORGS).doc(orgId).set(
    {
      executiveReportSchedule: {
        ...schedule,
        lastGeneratedAt: now.toISOString(),
        nextScheduledAt,
      },
    },
    { merge: true },
  )

  return NextResponse.json({ id, snapshot: { id, ...snapshot } })
}

