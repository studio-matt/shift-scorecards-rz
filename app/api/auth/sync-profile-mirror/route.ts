import { NextRequest, NextResponse } from "next/server"
import {
  FieldValue,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

const USERS = "users"
const USER_PROFILES = "userProfiles"

type UserCandidate = {
  id: string
  snap: QueryDocumentSnapshot<DocumentData>
  data: Record<string, unknown>
}

function timestampRank(data: Record<string, unknown>) {
  return String(data.updatedAt || data.lastLogin || data.createdAt || "")
}

function chooseUserCandidate(rows: UserCandidate[], preferredAuthId: string): UserCandidate | null {
  if (rows.length === 0) return null

  const byAuth = rows.find((row) => String(row.data.authId || "") === preferredAuthId)
  if (byAuth) return byAuth

  return [...rows].sort((a, b) => {
    const aOrg = String(a.data.organizationId || "").trim()
    const bOrg = String(b.data.organizationId || "").trim()
    if (Boolean(bOrg) !== Boolean(aOrg)) return bOrg ? 1 : -1

    const aAuth = Boolean(String(a.data.authId || "").trim())
    const bAuth = Boolean(String(b.data.authId || "").trim())
    if (aAuth !== bAuth) return aAuth ? 1 : -1

    return timestampRank(b.data).localeCompare(timestampRank(a.data))
  })[0]
}

/**
 * Rebuild the signed-in user's security-rule mirror.
 * This is intentionally scoped to the caller, unlike the admin mirror endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 })
    }

    const auth = getAdminAuth()
    let decoded: { uid: string; email?: string }
    try {
      decoded = await auth.verifyIdToken(token)
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as { userDocId?: string }
    const requestedUserDocId = String(body.userDocId || "").trim()
    const email = decoded.email?.toLowerCase() ?? ""
    const db = getAdminDb()

    let userDoc: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData> | null = null

    if (requestedUserDocId) {
      const snap = await db.collection(USERS).doc(requestedUserDocId).get()
      if (snap.exists) userDoc = snap
    }

    if (!userDoc) {
      const byAuth = await db.collection(USERS).where("authId", "==", decoded.uid).limit(1).get()
      if (!byAuth.empty) userDoc = byAuth.docs[0]
    }

    if (!userDoc && email) {
      const byEmail = await db.collection(USERS).where("email", "==", email).limit(25).get()
      const candidate = chooseUserCandidate(
        byEmail.docs.map((snap) => ({
          id: snap.id,
          snap,
          data: snap.data() as Record<string, unknown>,
        })),
        decoded.uid,
      )
      if (candidate) userDoc = candidate.snap
    }

    if (!userDoc || !userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userDocId = userDoc.id
    const userData = userDoc.data() as Record<string, unknown>
    const userEmail = String(userData.email || "").toLowerCase()
    const authId = String(userData.authId || "")

    if (authId && authId !== decoded.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!authId && (!email || userEmail !== email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!authId) {
      await userDoc.ref.set(
        {
          authId: decoded.uid,
          lastLogin: new Date().toISOString(),
        },
        { merge: true },
      )
    }

    const firstName = (userData.firstName as string) ?? ""
    const lastName = (userData.lastName as string) ?? ""
    const name = `${firstName} ${lastName}`.trim() || userEmail || email

    await db.collection(USER_PROFILES).doc(decoded.uid).set(
      {
        authId: decoded.uid,
        userDocId,
        role: (userData.role as string) || "user",
        organizationId: (userData.organizationId as string) || "",
        department: (userData.department as string) || "",
        email: userEmail || email,
        name,
        status: (userData.status as string) || "active",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return NextResponse.json({ ok: true, userDocId })
  } catch (e) {
    console.error("sync-profile-mirror:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
