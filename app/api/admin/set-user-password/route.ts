import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { verifyCallerIsAdmin } from "@/lib/verify-admin-request"

const USERS = "users"
const USER_PROFILES = "userProfiles"

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase()
}

function displayName(userData: Record<string, unknown>) {
  const firstName = String(userData.firstName || "").trim()
  const lastName = String(userData.lastName || "").trim()
  return `${firstName} ${lastName}`.trim() || String(userData.email || "")
}

async function rebuildMirror(authId: string, userDocId: string, userData: Record<string, unknown>) {
  await getAdminDb().collection(USER_PROFILES).doc(authId).set(
    {
      authId,
      userDocId,
      role: String(userData.role || "user"),
      organizationId: String(userData.organizationId || ""),
      department: String(userData.department || ""),
      email: normalizeEmail(userData.email),
      name: displayName(userData),
      status: String(userData.status || "active"),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

export async function POST(request: NextRequest) {
  const authz = await verifyCallerIsAdmin(request)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  if (authz.role !== "admin") {
    return NextResponse.json({ error: "Forbidden - super admin required" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    userDocId?: string
    password?: string
  }
  const userDocId = String(body.userDocId || "").trim()
  const password = String(body.password || "")

  if (!userDocId) {
    return NextResponse.json({ error: "userDocId is required" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const db = getAdminDb()
  const auth = getAdminAuth()
  const userRef = db.collection(USERS).doc(userDocId)
  const userSnap = await userRef.get()
  if (!userSnap.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const userData = userSnap.data() as Record<string, unknown>
  const email = normalizeEmail(userData.email)
  if (!email) {
    return NextResponse.json({ error: "User has no email address" }, { status: 400 })
  }

  let authId = String(userData.authId || "").trim()
  let createdAuthUser = false

  if (authId) {
    try {
      await auth.updateUser(authId, { password, email })
    } catch (error) {
      const e = error as { code?: string; message?: string }
      if (e.code !== "auth/user-not-found") {
        console.error("[set-user-password] update failed", {
          userDocId,
          authId,
          code: e.code,
          message: e.message,
        })
        throw error
      }
      authId = ""
    }
  }

  if (!authId) {
    try {
      const existing = await auth.getUserByEmail(email)
      authId = existing.uid
      await auth.updateUser(authId, { password, displayName: displayName(userData) })
    } catch (error) {
      const e = error as { code?: string; message?: string }
      if (e.code !== "auth/user-not-found") {
        console.error("[set-user-password] lookup/create failed", {
          userDocId,
          email,
          code: e.code,
          message: e.message,
        })
        throw error
      }
      const created = await auth.createUser({
        email,
        password,
        displayName: displayName(userData),
        emailVerified: false,
      })
      authId = created.uid
      createdAuthUser = true
    }
  }

  const userPatch = {
    authId,
    status: "active",
    updatedAt: FieldValue.serverTimestamp(),
  }
  await userRef.set(userPatch, { merge: true })
  await rebuildMirror(authId, userDocId, { ...userData, ...userPatch })

  console.log("[set-user-password] password set by admin", {
    userDocId,
    authId,
    createdAuthUser,
    email,
  })

  return NextResponse.json({
    success: true,
    authId,
    createdAuthUser,
  })
}
