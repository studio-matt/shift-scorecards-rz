import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

const USERS = "users"
const USER_PROFILES = "userProfiles"

/**
 * Creates a staging user (no org) when someone signs up without a prior invite.
 * Requires Firebase ID token; uses Admin SDK to bypass client create rules.
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

    const email = decoded.email?.toLowerCase()
    if (!email) {
      return NextResponse.json({ error: "No email on token" }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      firstName?: string
      lastName?: string
      department?: string
    }

    const db = getAdminDb()
    const existingSnap = await db.collection(USERS).where("email", "==", email).limit(1).get()

    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0]
      const data = doc.data()
      const updates: Record<string, unknown> = {}
      if (!data.authId) {
        updates.authId = decoded.uid
        updates.lastLogin = new Date().toISOString()
      }
      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates)
      }
      await db.collection(USER_PROFILES).doc(decoded.uid).set(
        {
          authId: decoded.uid,
          userDocId: doc.id,
          role: (data.role as string) || "user",
          organizationId: (data.organizationId as string) || "",
          department: (data.department as string) || "",
          email,
          name: `${(data.firstName as string) || ""} ${(data.lastName as string) || ""}`.trim() || email,
          status: (data.status as string) || "active",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      return NextResponse.json({ created: false, userId: doc.id })
    }

    const firstName = (body.firstName || "").trim() || "User"
    const lastName = (body.lastName || "").trim()
    const now = new Date().toISOString()

    const userRef = await db.collection(USERS).add({
      email,
      firstName,
      lastName,
      organizationId: "",
      department: (body.department || "").trim(),
      role: "user",
      status: "staging",
      authId: decoded.uid,
      createdAt: now,
      lastLogin: now,
    })

    await db.collection(USER_PROFILES).doc(decoded.uid).set({
      authId: decoded.uid,
      userDocId: userRef.id,
      role: "user",
      organizationId: "",
      department: (body.department || "").trim(),
      email,
      name: `${firstName} ${lastName}`.trim(),
      status: "staging",
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ created: true, userId: userRef.id })
  } catch (e) {
    console.error("create-staging-profile:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
