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

  const body = (await request.json().catch(() => ({}))) as { fromUserId?: string; toUserId?: string }
  const fromUserId = String(body.fromUserId || "").trim()
  const toUserId = String(body.toUserId || "").trim()
  if (!fromUserId || !toUserId) {
    return NextResponse.json({ error: "fromUserId and toUserId required" }, { status: 400 })
  }
  if (fromUserId === toUserId) {
    return NextResponse.json({ ok: true, moved: 0 })
  }

  const db = getAdminDb()

  // If company_admin, ensure BOTH users are in same org and all moved responses are in that org.
  if (authz.role === "company_admin" && authz.orgId) {
    const [fromSnap, toSnap] = await Promise.all([
      db.collection("users").doc(fromUserId).get(),
      db.collection("users").doc(toUserId).get(),
    ])
    const fromOrg = fromSnap.exists ? String(fromSnap.data()?.organizationId || "") : ""
    const toOrg = toSnap.exists ? String(toSnap.data()?.organizationId || "") : ""
    if (!fromOrg || !toOrg || fromOrg !== authz.orgId || toOrg !== authz.orgId) {
      return NextResponse.json({ error: "Forbidden - org scope mismatch" }, { status: 403 })
    }
  }

  // Firestore doesn't allow server-side joins; iterate in pages.
  const responses = db.collection("responses").where("userId", "==", fromUserId)
  let moved = 0
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null
  const PAGE_SIZE = 250

  while (true) {
    let q = responses.limit(PAGE_SIZE)
    if (lastDoc) q = q.startAfter(lastDoc)
    const snap = await q.get()
    if (snap.empty) break

    // Org scope enforcement for company_admin: ensure each response matches orgId.
    if (authz.role === "company_admin" && authz.orgId) {
      for (const d of snap.docs) {
        const orgId = String(d.data()?.organizationId || "")
        if (orgId && orgId !== authz.orgId) {
          return NextResponse.json({ error: "Forbidden - response org scope mismatch" }, { status: 403 })
        }
      }
    }

    const batch = db.batch()
    for (const d of snap.docs) {
      batch.update(d.ref, { userId: toUserId, updatedAt: new Date().toISOString() })
      moved++
    }
    await batch.commit()

    lastDoc = snap.docs[snap.docs.length - 1]
    if (snap.size < PAGE_SIZE) break
  }

  return NextResponse.json({ ok: true, moved })
}

