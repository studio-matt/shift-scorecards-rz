import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { sendEmail } from "@/lib/email-service"
import type { EmailTemplateType } from "@/lib/types"

async function verifyAnyAdmin(request: Request): Promise<{ authorized: boolean; reason?: string }> {
  try {
    const auth = getAdminAuth()
    let uid: string | null = null

    // Option 1: Authorization: Bearer <ID_TOKEN> (preferred; matches authHeaders())
    const header = request.headers.get("authorization") || ""
    if (header.toLowerCase().startsWith("bearer ")) {
      const token = header.slice("bearer ".length).trim()
      if (token) {
        try {
          const decoded = await auth.verifyIdToken(token, true)
          uid = decoded.uid || null
        } catch (e) {
          return { authorized: false, reason: `Invalid bearer token: ${String(e)}` }
        }
      }
    }

    // Option 2: firebase-session cookie (fallback)
    if (!uid) {
      const cookieStore = await cookies()
      const sessionCookie = cookieStore.get("firebase-session")?.value
      if (sessionCookie) {
        try {
          const decoded = await auth.verifySessionCookie(sessionCookie, true)
          uid = decoded.uid || null
        } catch (e) {
          return { authorized: false, reason: `Invalid session cookie: ${String(e)}` }
        }
      }
    }

    if (!uid) return { authorized: false, reason: "No auth token provided" }

    const db = getAdminDb()

    // Preferred: mirror doc keyed by auth uid
    const profile = await db.collection("userProfiles").doc(uid).get()
    const role = profile.exists ? (profile.data()?.role as string | undefined) : undefined
    if (role === "admin" || role === "company_admin") return { authorized: true }

    // Fallback: users row keyed by authId (bootstrap)
    const u = await db.collection("users").where("authId", "==", uid).limit(1).get()
    if (!u.empty) {
      const uRole = u.docs[0].data()?.role as string | undefined
      if (uRole === "admin" || uRole === "company_admin") return { authorized: true }
      return { authorized: false, reason: `Role is "${uRole}", not an admin role` }
    }

    return { authorized: false, reason: "User not found in userProfiles or users" }
  } catch (e) {
    return { authorized: false, reason: `Auth error: ${String(e)}` }
  }
}

type InviteInput = {
  email: string
  firstName?: string
  lastName?: string
  department?: string
  organizationId?: string
  role?: string
}

const TEMPLATE: EmailTemplateType = "member_invitation"

export async function POST(request: Request) {
  const authz = await verifyAnyAdmin(request)
  if (!authz.authorized) {
    return NextResponse.json(
      { error: "Forbidden - admin access required", reason: authz.reason },
      { status: 403 },
    )
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      invites?: InviteInput[]
      orgName?: string
    }

    const invites = Array.isArray(body.invites) ? body.invites : []
    if (invites.length === 0) {
      return NextResponse.json({ error: "No invites provided" }, { status: 400 })
    }

    const db = getAdminDb()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scorecard.envoydesign.com"
    const orgName = body.orgName || "Shift Scorecards"

    let recorded = 0
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const inv of invites) {
      const email = String(inv.email || "").trim().toLowerCase()
      if (!email || !email.includes("@")) continue

      // Record invite in Firestore (admin SDK bypasses rules)
      try {
        await db.collection("invites").add({
          email,
          firstName: (inv.firstName || "").trim(),
          lastName: (inv.lastName || "").trim(),
          department: (inv.department || "").trim(),
          organizationId: (inv.organizationId || "").trim(),
          role: (inv.role || "user").trim(),
          status: "pending",
          createdAt: new Date().toISOString(),
        })
        recorded++
      } catch (e) {
        failed++
        errors.push(`${email}: failed to record invite (${String(e)})`)
        continue
      }

      // Send via Resend using the canonical template store
      const emailResult = await sendEmail({
        to: email,
        templateType: TEMPLATE,
        data: {
          "{{organizationName}}": orgName,
          "{{inviteLink}}": appUrl,
          "{{firstName}}": inv.firstName?.trim() || "there",
        },
      })
      if (emailResult.success) {
        sent++
      } else {
        failed++
        errors.push(`${email}: ${emailResult.error || "send failed"}`)
      }
    }

    return NextResponse.json({
      recorded,
      sent,
      failed,
      total: invites.length,
      errors,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

