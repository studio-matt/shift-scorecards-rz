import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") || ""
  if (!auth.startsWith("Bearer ")) return false
  const token = auth.slice("Bearer ".length).trim()
  if (!token) return false
  const candidates = [
    process.env.DEBUG_SECRET,
    process.env.CRON_SECRET,
    process.env.BACKFILL_SECRET,
  ].filter((v): v is string => typeof v === "string" && v.length > 0)
  return candidates.includes(token)
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

type CountMap = Record<string, number>

function bump(map: CountMap, key: string) {
  map[key] = (map[key] || 0) + 1
}

function topN(map: CountMap, n = 20) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }))
}

/**
 * Diagnostics endpoint: show where "pending invites" live.
 *
 * - Legacy invites: /invites where status == "pending"
 * - Pending users: /users where authId is missing (invite not accepted yet)
 *
 * Optional query params:
 * - orgId=<id> (include samples for that orgId)
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401)

  const { searchParams } = new URL(req.url)
  const orgId = (searchParams.get("orgId") || "").trim()

  try {
    const db = getAdminDb()

    // Organizations lookup for name mapping
    const orgsSnap = await db.collection("organizations").get()
    const orgNameById = new Map<string, string>()
    for (const d of orgsSnap.docs) {
      const name = String(d.data()?.name || "").trim()
      orgNameById.set(d.id, name || d.id)
    }

    // 1) Legacy invites inventory
    const invitesCounts: CountMap = {}
    const invitesEmptyOrgCounts: CountMap = {}
    const invitesSnap = await db.collection("invites").where("status", "==", "pending").limit(5000).get()
    const invitesSamples: Array<{ email: string; organizationId: string }> = []
    for (const d of invitesSnap.docs) {
      const data = d.data() as { email?: string; organizationId?: string }
      const email = String(data.email || "").trim().toLowerCase()
      const oid = String(data.organizationId || "").trim()
      bump(invitesCounts, oid || "__EMPTY__")
      if (!oid) bump(invitesEmptyOrgCounts, "__EMPTY__")
      if (orgId && oid === orgId && invitesSamples.length < 25 && email.includes("@")) {
        invitesSamples.push({ email, organizationId: oid })
      }
    }

    // 2) Pending users inventory
    const usersCounts: CountMap = {}
    const usersSnap = await db.collection("users").limit(5000).get()
    const pendingUsersSamples: Array<{ email: string; organizationId: string }> = []
    let pendingUsersTotal = 0
    for (const d of usersSnap.docs) {
      const data = d.data() as { authId?: string; email?: string; organizationId?: string }
      if (data.authId) continue
      const email = String(data.email || "").trim().toLowerCase()
      if (!email.includes("@")) continue
      pendingUsersTotal++
      const oid = String(data.organizationId || "").trim()
      bump(usersCounts, oid || "__EMPTY__")
      if (orgId && oid === orgId && pendingUsersSamples.length < 25) {
        pendingUsersSamples.push({ email, organizationId: oid })
      }
    }

    // Pretty mapping for top keys
    const invitesTop = topN(invitesCounts, 25).map((x) => ({
      ...x,
      orgName: x.key !== "__EMPTY__" ? orgNameById.get(x.key) || null : null,
    }))
    const usersTop = topN(usersCounts, 25).map((x) => ({
      ...x,
      orgName: x.key !== "__EMPTY__" ? orgNameById.get(x.key) || null : null,
    }))

    return json({
      ok: true,
      invites: {
        pendingDocsScanned: invitesSnap.size,
        byOrganizationIdTop: invitesTop,
      },
      users: {
        docsScanned: usersSnap.size,
        pendingNoAuthIdCount: pendingUsersTotal,
        byOrganizationIdTop: usersTop,
      },
      samples: orgId
        ? {
            orgId,
            orgName: orgNameById.get(orgId) || null,
            invites: invitesSamples,
            pendingUsers: pendingUsersSamples,
          }
        : null,
    })
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
}

