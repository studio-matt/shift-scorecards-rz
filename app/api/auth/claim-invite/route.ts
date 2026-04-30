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

    const inviteOrg = String(invite.organizationId ?? "").trim()
    const inviteDept = String(invite.department ?? "").trim()
    const inviteRole = String(invite.role ?? "user").trim()

    const ts = (p: Record<string, unknown>) =>
      String((p.updatedAt as string) || (p.createdAt as string) || "")

    // All user rows for this email (duplicates happen: staging + invited, etc.)
    let userRows = await db.collection(USERS).where("email", "==", email).get()

    // Propagate org/dept/role from invite onto every row missing it (so we never attach auth to a stale unassigned row).
    const now = new Date().toISOString()
    for (const d of userRows.docs) {
      const p = d.data() as Record<string, unknown>
      const patch: Record<string, unknown> = {}
      if (!String(p.organizationId ?? "").trim() && inviteOrg) patch.organizationId = inviteOrg
      if (!String(p.department ?? "").trim() && inviteDept) patch.department = inviteDept
      if (!String(p.role ?? "").trim() && inviteRole) patch.role = inviteRole
      if (!String(p.firstName ?? "").trim() && invite.firstName)
        patch.firstName = String(invite.firstName || "")
      if (!String(p.lastName ?? "").trim() && invite.lastName)
        patch.lastName = String(invite.lastName || "")
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = now
        await d.ref.set(patch, { merge: true })
      }
    }

    userRows = await db.collection(USERS).where("email", "==", email).get()
    const parsed = userRows.docs.map((d) => ({
      id: d.id,
      ref: d.ref,
      data: d.data() as Record<string, unknown>,
    }))

    let userDocId: string
    let userData: Record<string, unknown>

    if (parsed.length === 0) {
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
    } else {
      const mine = parsed.find((r) => r.data.authId === decoded.uid)
      let row: (typeof parsed)[0] | undefined
      if (mine) {
        row = mine
      } else {
        const claimable = parsed.filter((r) => !r.data.authId)
        if (claimable.length === 0) {
          return NextResponse.json(
            {
              error:
                "This email is already linked to another account. Ask an administrator to resolve duplicate user records.",
            },
            { status: 409 },
          )
        }
        claimable.sort((a, b) => {
          const ao = String(a.data.organizationId ?? "").trim()
          const bo = String(b.data.organizationId ?? "").trim()
          const aMatch = inviteOrg && ao === inviteOrg ? 1 : 0
          const bMatch = inviteOrg && bo === inviteOrg ? 1 : 0
          if (bMatch !== aMatch) return bMatch - aMatch
          const aHas = ao ? 1 : 0
          const bHas = bo ? 1 : 0
          if (bHas !== aHas) return bHas - aHas
          return ts(b.data).localeCompare(ts(a.data))
        })
        row = claimable[0]
      }

      if (!row) {
        return NextResponse.json({ error: "Could not resolve user record" }, { status: 500 })
      }

      userDocId = row.id
      userData = { ...row.data }
      const updates: Record<string, unknown> = {
        lastLogin: now,
        status: "active",
      }
      if (!mine) {
        updates.authId = decoded.uid
      }
      if (!String(userData.organizationId ?? "").trim() && inviteOrg) updates.organizationId = inviteOrg
      if (!String(userData.department ?? "").trim() && inviteDept) updates.department = inviteDept
      if (!String(userData.role ?? "").trim() && inviteRole) updates.role = inviteRole
      if (!String(userData.firstName ?? "").trim() && invite.firstName)
        updates.firstName = String(invite.firstName || "")
      if (!String(userData.lastName ?? "").trim() && invite.lastName)
        updates.lastName = String(invite.lastName || "")
      await row.ref.set(updates, { merge: true })
      userData = { ...userData, ...updates }
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

