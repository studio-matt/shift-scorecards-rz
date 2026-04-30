import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { verifyCallerIsAdmin } from "@/lib/verify-admin-request"

const USERS = "users"

export async function POST(request: NextRequest) {
  const authz = await verifyCallerIsAdmin(request)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const body = (await request.json().catch(() => ({}))) as { userIds?: string[] }
  const userIds = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : []
  if (userIds.length === 0) {
    return NextResponse.json({ error: "userIds is required" }, { status: 400 })
  }

  const db = getAdminDb()
  let updated = 0
  const errors: string[] = []

  for (let i = 0; i < userIds.length; i += 400) {
    const chunk = userIds.slice(i, i + 400)
    const batch = db.batch()
    for (const id of chunk) {
      const ref = db.collection(USERS).doc(id)
      batch.set(
        ref,
        {
          status: "cancelled",
          cancelledAt: new Date().toISOString(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      updated++
    }
    try {
      await batch.commit()
    } catch (e) {
      errors.push(String(e))
    }
  }

  return NextResponse.json({ success: errors.length === 0, updated, errors })
}

