import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { verifyCallerIsAdmin } from "@/lib/verify-admin-request"
import type { Organization } from "@/lib/types"
import { buildRollupSnapshot, defaultRollupPeriod, getLatestRollupSnapshotForOrg, saveRollupSnapshot } from "@/lib/rollup-snapshots"

const ORGS = "organizations"

async function orgNameMap(adminDb: ReturnType<typeof getAdminDb>): Promise<Map<string, string>> {
  const snap = await adminDb.collection(ORGS).get()
  const m = new Map<string, string>()
  for (const d of snap.docs) {
    const data = d.data() as { name?: string }
    m.set(d.id, data.name || d.id)
  }
  return m
}

export async function GET(request: NextRequest) {
  const auth = await verifyCallerIsAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const url = new URL(request.url)
  const organizationId = url.searchParams.get("organizationId") || auth.organizationId
  if (!organizationId) return NextResponse.json({ error: "Missing organizationId" }, { status: 400 })

  const adminDb = getAdminDb()
  const latest = await getLatestRollupSnapshotForOrg(adminDb, organizationId)
  return NextResponse.json({ latest })
}

export async function POST(request: NextRequest) {
  const auth = await verifyCallerIsAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json().catch(() => ({}))) as {
    organizationId?: string
    periodStart?: string // YYYY-MM-DD
    periodEnd?: string // YYYY-MM-DD
  }

  const organizationId = body.organizationId || auth.organizationId
  if (!organizationId) return NextResponse.json({ error: "Missing organizationId" }, { status: 400 })

  const adminDb = getAdminDb()
  const orgSnap = await adminDb.collection(ORGS).doc(organizationId).get()
  if (!orgSnap.exists) return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  const org = { id: orgSnap.id, ...(orgSnap.data() as Omit<Organization, "id">) } as Organization

  const previous = await getLatestRollupSnapshotForOrg(adminDb, organizationId)
  const period = body.periodStart && body.periodEnd
    ? { startDate: body.periodStart, endDate: body.periodEnd }
    : defaultRollupPeriod({ previous })

  const snapshot = await buildRollupSnapshot({
    adminDb,
    organization: { id: org.id, name: org.name, hourlyRate: org.hourlyRate },
    orgNameById: await orgNameMap(adminDb),
    periodStart: period.startDate,
    periodEnd: period.endDate,
    previous,
  })

  const id = await saveRollupSnapshot(adminDb, snapshot)
  return NextResponse.json({ id, snapshot: { id, ...snapshot } })
}

