import { NextRequest, NextResponse } from "next/server"
import type { Firestore } from "firebase-admin/firestore"
import { getAdminDb, deleteUserFromAuth, deleteUserFromAuthByUid } from "@/lib/firebase-admin"
import { verifyCallerIsAdmin } from "@/lib/verify-admin-request"

const USERS = "users"
const USER_PROFILES = "userProfiles"
const RESPONSES = "responses"

function callerCanDeleteTarget(
  caller: { role: string; organizationId: string },
  targetOrgId: string,
): boolean {
  if (caller.role === "admin") return true
  if (caller.role === "company_admin") {
    return Boolean(caller.organizationId && caller.organizationId === targetOrgId)
  }
  return false
}

async function deleteResponsesForUserDocId(db: Firestore, userDocId: string) {
  const snap = await db.collection(RESPONSES).where("userId", "==", userDocId).get()
  if (snap.empty) return 0
  let deleted = 0
  const docs = snap.docs
  for (let i = 0; i < docs.length; i += 500) {
    const batch = db.batch()
    const chunk = docs.slice(i, i + 500)
    for (const d of chunk) {
      batch.delete(d.ref)
    }
    await batch.commit()
    deleted += chunk.length
  }
  return deleted
}

export async function POST(request: NextRequest) {
  try {
    const authz = await verifyCallerIsAdmin(request)
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status })
    }

    const body = await request.json()
    const { userId, email, authId } = body as {
      userId?: string
      email?: string
      authId?: string
    }

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const db = getAdminDb()
    const userRef = db.collection(USERS).doc(userId)
    const userSnap = await userRef.get()
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userSnap.data() as Record<string, unknown>
    const targetOrgId = (userData.organizationId as string) || ""
    if (!callerCanDeleteTarget({ role: authz.role, organizationId: authz.organizationId }, targetOrgId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let userEmail = email || (userData.email as string)
    let userAuthId = authId || (userData.authId as string)

    const responsesDeleted = await deleteResponsesForUserDocId(db, userId)

    let authDeleteResult: { success: boolean; error?: string } = { success: true }
    if (userAuthId) {
      authDeleteResult = await deleteUserFromAuthByUid(userAuthId)
    } else if (userEmail) {
      authDeleteResult = await deleteUserFromAuth(userEmail)
    }

    if (!authDeleteResult.success) {
      console.error("Failed to delete from Firebase Auth:", authDeleteResult.error)
    }

    if (userAuthId) {
      try {
        await db.collection(USER_PROFILES).doc(userAuthId).delete()
      } catch (e) {
        console.error("Failed to delete userProfiles mirror:", e)
      }
    }

    try {
      await userRef.delete()
    } catch (e) {
      console.error("Failed to delete user from Firestore:", e)
      return NextResponse.json(
        {
          error: "Failed to delete user from database",
          authDeleted: authDeleteResult.success,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      authDeleted: authDeleteResult.success,
      firestoreDeleted: true,
      responsesDeleted,
    })
  } catch (error) {
    console.error("Error in delete-user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  return POST(request)
}
