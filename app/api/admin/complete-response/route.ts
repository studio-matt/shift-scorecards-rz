import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

async function verifyAnyAdmin(request: Request): Promise<{ authorized: boolean; uid?: string; role?: string; orgId?: string; reason?: string }> {
  try {
    const auth = getAdminAuth()
    let uid: string | null = null

    const header = request.headers.get("authorization") || ""
    if (header.toLowerCase().startsWith("bearer ")) {
      const token = header.slice("bearer ".length).trim()
      if (token) {
        const decoded = await auth.verifyIdToken(token, true)
        uid = decoded.uid || null
      }
    }

    if (!uid) {
      const cookieStore = await cookies()
      const sessionCookie = cookieStore.get("firebase-session")?.value
      if (sessionCookie) {
        const decoded = await auth.verifySessionCookie(sessionCookie, true)
        uid = decoded.uid || null
      }
    }

    if (!uid) return { authorized: false, reason: "No auth token provided" }

    const db = getAdminDb()
    const profile = await db.collection("userProfiles").doc(uid).get()
    const role = profile.exists ? (profile.data()?.role as string | undefined) : undefined
    const orgId = profile.exists ? (profile.data()?.organizationId as string | undefined) : undefined
    if (role === "admin" || role === "company_admin") return { authorized: true, uid, role, orgId }

    return { authorized: false, reason: `Role is "${role}", not an admin role` }
  } catch (e) {
    return { authorized: false, reason: `Auth error: ${String(e)}` }
  }
}

export async function POST(request: Request) {
  const authz = await verifyAnyAdmin(request)
  if (!authz.authorized) {
    return NextResponse.json(
      { error: "Forbidden - admin access required", reason: authz.reason },
      { status: 403 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as { responseId?: string }
  const responseId = String(body.responseId || "").trim()
  if (!responseId) return NextResponse.json({ error: "responseId required" }, { status: 400 })

  const db = getAdminDb()
  const ref = db.collection("responses").doc(responseId)
  const snap = await ref.get()
  if (!snap.exists) return NextResponse.json({ error: "Response not found" }, { status: 404 })

  const data = snap.data() || {}
  const orgId = String(data.organizationId || "")
  const status = String(data.status || "")

  if (authz.role === "company_admin" && authz.orgId && orgId && orgId !== authz.orgId) {
    return NextResponse.json({ error: "Forbidden - org scope mismatch" }, { status: 403 })
  }

  if (status !== "draft") {
    // Idempotent: if already completed, just return.
    return NextResponse.json({ ok: true, status, responseId })
  }

  await ref.update({
    status: "completed",
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, status: "completed", responseId })
}

