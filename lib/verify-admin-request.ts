import type { NextRequest } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

const USER_PROFILES = "userProfiles"

export type AdminAuthResult =
  | { ok: true; uid: string; role: string; organizationId: string }
  | { ok: false; status: number; error: string }

/**
 * Verifies Authorization Bearer ID token; caller must have userProfiles with role admin or company_admin.
 */
export async function verifyCallerIsAdmin(request: NextRequest): Promise<AdminAuthResult> {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) {
    return { ok: false, status: 401, error: "Missing authorization" }
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    const prof = await getAdminDb().collection(USER_PROFILES).doc(decoded.uid).get()
    const data = prof.data()
    if (!data) {
      return { ok: false, status: 403, error: "No profile for caller" }
    }
    const role = (data.role as string) || "user"
    const organizationId = (data.organizationId as string) || ""
    if (role !== "admin" && role !== "company_admin") {
      return { ok: false, status: 403, error: "Forbidden" }
    }
    return { ok: true, uid: decoded.uid, role, organizationId }
  } catch {
    return { ok: false, status: 401, error: "Invalid token" }
  }
}
