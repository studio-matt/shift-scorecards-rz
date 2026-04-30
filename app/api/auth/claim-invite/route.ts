import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

const INVITES = "invites"
const USERS = "users"
const USER_PROFILES = "userProfiles"

/**
 * Claim an invite row on first OAuth login.
 * Creates/updates /users and /userProfiles using Admin SDK (bypasses client create rules).
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

    const db = getAdminDb()

    // Find invite by email.
    const inviteSnap = await db.collection(INVITES).where("email", "==", email).limit(1).get()
    if (inviteSnap.empty) {
      return NextResponse.json({ error: "No invite found for this email" }, { status: 404 })
    }
    const inviteDoc = inviteSnap.docs[0]
    const invite = inviteDoc.data() as Record<string, unknown>

    // Upsert user doc by email.
    const existingUserSnap = await db.collection(USERS).where("email", "==", email).limit(1).get()
    let userDocId: string
    let userData: Record<string, unknown>
    if (!existingUserSnap.empty) {
      const doc = existingUserSnap.docs[0]
      userDocId = doc.id
      userData = { ...doc.data() }
      const updates: Record<string, unknown> = {
        authId: decoded.uid,
        lastLogin: new Date().toISOString(),
        status: "active",
      }
      // Fill missing fields from invite when absent.
      if (!userData.organizationId && invite.organizationId) updates.organizationId = invite.organizationId
      if (!userData.department && invite.department) updates.department = invite.department
      if (!userData.role && invite.role) updates.role = invite.role
      if (!userData.firstName && invite.firstName) updates.firstName = invite.firstName
      if (!userData.lastName && invite.lastName) updates.lastName = invite.lastName
      await doc.ref.set(updates, { merge: true })
      userData = { ...userData, ...updates }
    } else {
      const now = new Date().toISOString()
      const newUser = {
        email,
        firstName: String(invite.firstName || ""),
        lastName: String(invite.lastName || ""),
        department: String(invite.department || ""),
        organizationId: String(invite.organizationId || ""),
        role: String(invite.role || "user"),
        status: "active",
        authId: decoded.uid,
        createdAt: now,
        lastLogin: now,
      }
      const ref = await db.collection(USERS).add(newUser)
      userDocId = ref.id
      userData = newUser
    }

    // Create/merge mirror doc for security rules.
    const firstName = (userData.firstName as string) ?? ""
    const lastName = (userData.lastName as string) ?? ""
    const name = `${firstName} ${lastName}`.trim() || email
    await db.collection(USER_PROFILES).doc(decoded.uid).set(
      {
        authId: decoded.uid,
        userDocId,
        role: (userData.role as string) || "user",
        organizationId: (userData.organizationId as string) || "",
        department: (userData.department as string) || "",
        email,
        name,
        status: (userData.status as string) || "active",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    // Delete invite (one-time claim).
    await inviteDoc.ref.delete()

    return NextResponse.json({ ok: true, userDocId })
  } catch (e) {
    console.error("claim-invite:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

