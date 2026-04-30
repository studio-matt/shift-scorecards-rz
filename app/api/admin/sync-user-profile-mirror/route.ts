import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { verifyCallerIsAdmin } from "@/lib/verify-admin-request"

const USERS = "users"
const USER_PROFILES = "userProfiles"

/**
 * Rebuilds `userProfiles/{authUid}` from the current `users/{userDocId}` document using Admin SDK.
 * Required when an admin updates another user — client cannot write that mirror (rules: uid match only).
 *
 * Call **after** `updateDocument` on `users` so the server reads final field values.
 */
export async function POST(request: NextRequest) {
  try {
    const authz = await verifyCallerIsAdmin(request)
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status })
    }

    const body = (await request.json()) as { userDocId?: string }
    const userDocId = body.userDocId
    if (!userDocId) {
      return NextResponse.json({ error: "userDocId is required" }, { status: 400 })
    }

    const db = getAdminDb()
    const userSnap = await db.collection(USERS).doc(userDocId).get()
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const target = userSnap.data() as Record<string, unknown>
    const authId = target.authId as string | undefined
    if (!authId) {
      return NextResponse.json({ error: "User has no auth account linked" }, { status: 400 })
    }

    if (authz.role === "company_admin") {
      const org = ((target.organizationId as string) ?? "").trim()
      if (org !== authz.organizationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const firstName = (target.firstName as string) ?? ""
    const lastName = (target.lastName as string) ?? ""
    const name =
      `${firstName} ${lastName}`.trim() || ((target.email as string) ?? "")

    await db.collection(USER_PROFILES).doc(authId).set(
      {
        authId,
        userDocId,
        role: (target.role as string) || "user",
        organizationId: (target.organizationId as string) || "",
        department: (target.department as string) || "",
        email: (target.email as string) || "",
        name,
        status: (target.status as string) || "active",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("sync-user-profile-mirror:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
