import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { getEmailSettings, getEmailTemplate, replacePlaceholders } from "@/lib/email-service"
import type { EmailTemplateType } from "@/lib/types"
import { Resend } from "resend"

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

    const settings = await getEmailSettings()
    if (!settings?.enabled) {
      return NextResponse.json({ error: "Email is not configured or disabled" }, { status: 400 })
    }

    const apiKey = settings.resendApiKey || process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Resend API key not configured" }, { status: 500 })
    }

    const fromEmail = settings.fromEmail && settings.fromEmail.includes("@") ? settings.fromEmail : ""
    const fromName = settings.fromName || "Shift Scorecards"
    if (!fromEmail) {
      return NextResponse.json({ error: "From email not configured" }, { status: 500 })
    }

    const template = await getEmailTemplate(TEMPLATE)
    if (!template.enabled) {
      return NextResponse.json({ error: `Template "${TEMPLATE}" is disabled` }, { status: 400 })
    }

    const resend = new Resend(apiKey)

    let recorded = 0
    let usersUpserted = 0
    let sent = 0
    let failed = 0
    const errors: string[] = []

    // Record all invites first, and build recipient list for batching.
    const recipients: string[] = []
    for (const inv of invites) {
      const email = String(inv.email || "").trim().toLowerCase()
      if (!email || !email.includes("@")) continue

      const organizationId = String(inv.organizationId || "").trim()
      if (!organizationId) {
        failed++
        errors.push(`${email}: missing organizationId`)
        continue
      }

      // Ensure a /users row exists so Manage Users shows them as pending immediately.
      try {
        const existing = await db.collection("users").where("email", "==", email).limit(1).get()
        const now = new Date().toISOString()
        const base = {
          email,
          firstName: (inv.firstName || "").trim(),
          lastName: (inv.lastName || "").trim(),
          department: (inv.department || "").trim(),
          organizationId,
          role: (inv.role || "user").trim(),
          status: "pending",
          updatedAt: now,
        }
        if (existing.empty) {
          await db.collection("users").add({ ...base, createdAt: now })
        } else {
          await existing.docs[0].ref.set(base, { merge: true })
        }
        usersUpserted++

        // Also record an invite row for legacy flows (optional but useful for audits).
        await db.collection("invites").add({
          email,
          firstName: base.firstName,
          lastName: base.lastName,
          department: base.department,
          organizationId: base.organizationId,
          role: base.role,
          status: "pending",
          createdAt: now,
        })
        recorded++
        recipients.push(email)
      } catch (e) {
        failed++
        errors.push(`${email}: failed to upsert user/invite (${String(e)})`)
      }
    }

    if (recipients.length > 0) {
      const subject = await replacePlaceholders(template.subject, {
        "{{organizationName}}": orgName,
      })
      const html = await replacePlaceholders(template.body, {
        "{{organizationName}}": orgName,
        "{{inviteLink}}": appUrl,
      })

      // Batch send to avoid Resend rate limits (100 per batch).
      const BATCH_SIZE = 100
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE).map((to) => ({
          from: `${fromName} <${fromEmail}>`,
          to,
          subject,
          html,
          reply_to: settings.replyToEmail || fromEmail,
        }))
        const result = await resend.batch.send(batch)
        if (result.error) {
          failed += batch.length
          errors.push(String(result.error?.message || result.error))
        } else if (result.data?.data) {
          sent += result.data.data.length
          // If Resend returns fewer results than requested, count remainder as failed.
          const missing = batch.length - result.data.data.length
          if (missing > 0) {
            failed += missing
            errors.push(`Resend batch accepted fewer emails than requested (${result.data.data.length}/${batch.length}).`)
          }
        } else {
          failed += batch.length
          errors.push("Resend batch returned no data.")
        }
      }
    }

    return NextResponse.json({
      recorded,
      usersUpserted,
      sent,
      failed,
      total: invites.length,
      errors,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

