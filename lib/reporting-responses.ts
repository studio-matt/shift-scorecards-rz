/**
 * Tier C: capped / org-scoped response loads — avoid full-collection scans for reporting & dashboard fallback.
 */

import type { RawResponse } from "@/lib/dashboard-data"
import {
  COLLECTIONS,
  getDocuments,
  getResponsesForOrgCompletedBetween,
  getResponsesForOrgLimited,
  getUserResponsesUnordered,
} from "@/lib/firestore"

export const REPORT_LOOKBACK_DAYS_DEFAULT = 120
export const DASH_FALLBACK_MAX_PER_ORG = 8000

function completedLowerBoundISO(lookbackDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() - lookbackDays)
  return d.toISOString()
}

/** Start of UTC tomorrow — upper bound exclusive for Firestore `<` queries. */
function completedUpperBoundExclusiveISO(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

async function fetchOrgResponsesBoundedOrFallback(
  organizationId: string,
  min: string,
  maxEx: string,
  cap: number,
): Promise<Array<{ id: string } & Record<string, unknown>>> {
  try {
    return await getResponsesForOrgCompletedBetween(organizationId, min, maxEx, cap)
  } catch (e) {
    console.warn(
      `[reporting] completedAt range query failed for org ${organizationId}; using capped org read.`,
      e,
    )
    return getResponsesForOrgLimited(organizationId, Math.min(cap, 25000))
  }
}

/** Bounded window for weekly email KPIs — one organization. */
export async function loadResponsesForWeeklyOrg(
  organizationId: string,
  lookbackDays = REPORT_LOOKBACK_DAYS_DEFAULT,
): Promise<RawResponse[]> {
  const min = completedLowerBoundISO(lookbackDays)
  const maxEx = completedUpperBoundExclusiveISO()
  const docs = await fetchOrgResponsesBoundedOrFallback(organizationId, min, maxEx, 25000)
  return docs.map((d) => ({ ...d } as unknown as RawResponse))
}

/**
 * Dashboard fallback when aggregates are empty — mirrors fetchAllResponses org/dept semantics
 * with date-bounded per-org reads (plus current user's docs merged for cross-scope visibility).
 */
export async function loadResponsesForDashboardFallback(
  orgId?: string,
  department?: string,
  includeUserId?: string,
  opts?: { lookbackDays?: number; maxDocsPerOrg?: number },
): Promise<RawResponse[]> {
  const lookbackDays = opts?.lookbackDays ?? REPORT_LOOKBACK_DAYS_DEFAULT
  const maxDocsPerOrg = opts?.maxDocsPerOrg ?? DASH_FALLBACK_MAX_PER_ORG

  const [allUsers, orgDocs] = await Promise.all([
    getDocuments(COLLECTIONS.USERS),
    getDocuments(COLLECTIONS.ORGANIZATIONS),
  ])

  const orgNameToIdMap = new Map<string, string>()
  for (const org of orgDocs) {
    const orgData = org as Record<string, unknown>
    const name = (orgData.name as string) || ""
    if (name) orgNameToIdMap.set(name.toLowerCase(), org.id)
  }

  const userOrgMap = new Map<string, string>()
  const userDeptMap = new Map<string, string>()
  for (const u of allUsers) {
    const userData = u as Record<string, unknown>
    let userOrg = (userData.organizationId as string) || ""
    if (!userOrg && userData.company) {
      userOrg = orgNameToIdMap.get((userData.company as string).toLowerCase()) || ""
    }
    if (userOrg) userOrgMap.set(u.id, userOrg)
    const dept = (userData.department as string) || ""
    if (dept) userDeptMap.set(u.id, dept)
  }

  const orgScope =
    orgId === undefined || orgId === null || orgId === "all"
      ? "all"
      : String(orgId).trim()
  if (orgScope === "") return []

  const min = completedLowerBoundISO(lookbackDays)
  const maxEx = completedUpperBoundExclusiveISO()

  const byId = new Map<string, RawResponse>()

  if (orgScope !== "all") {
    const docs = await fetchOrgResponsesBoundedOrFallback(
      orgScope,
      min,
      maxEx,
      maxDocsPerOrg * 2,
    )
    for (const d of docs) byId.set(d.id, { ...d } as unknown as RawResponse)
  } else {
    const loads = await Promise.all(
      orgDocs.map((o) =>
        fetchOrgResponsesBoundedOrFallback(o.id, min, maxEx, maxDocsPerOrg),
      ),
    )
    for (const docs of loads) {
      for (const d of docs) byId.set(d.id, { ...d } as unknown as RawResponse)
    }
  }

  if (includeUserId) {
    const mine = await getUserResponsesUnordered(includeUserId, 12000)
    for (const d of mine) byId.set(d.id, { ...d } as unknown as RawResponse)
  }

  let responses = [...byId.values()]

  const deptScope =
    department === undefined || department === null || department === "all"
      ? "all"
      : String(department).trim()

  if (orgScope !== "all") {
    responses = responses.filter((r) => {
      const userOrg = userOrgMap.get(r.userId)
      return (
        userOrg === orgScope || r.organizationId === orgScope || r.userId === includeUserId
      )
    })
  }

  if (deptScope !== "all") {
    if (deptScope === "") return []
    responses = responses.filter((r) => {
      const userDept = userDeptMap.get(r.userId) || r.department || ""
      return userDept === deptScope
    })
  }

  return responses
}
