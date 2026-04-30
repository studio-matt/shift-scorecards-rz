import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { getEmailSettings, getEmailTemplate, replacePlaceholders } from "@/lib/email-service"
import { Resend } from "resend"
import type { EmailTemplateType } from "@/lib/types"

async function verifyAnyAdmin(request: Request): Promise<{ authorized: boolean; reason?: string }> {
  try {
    const auth = getAdminAuth()
    let uid: string | null = null

    const header = request.headers.get("authorization") || ""
    if (header.toLowerCase().startsWith("bearer ")) {
      const token = header.slice("bearer ".length).trim()
      if (token) {
        // Allow server secrets (DEBUG_SECRET / CRON_SECRET / BACKFILL_SECRET) for recovery operations.
        // This avoids needing a browser ID token when doing emergency resends.
        const serverSecrets = [
          process.env.DEBUG_SECRET,
          process.env.CRON_SECRET,
          process.env.BACKFILL_SECRET,
        ].filter((v): v is string => typeof v === "string" && v.length > 0)
        if (serverSecrets.includes(token)) {
          return { authorized: true }
        }

        const decoded = await auth.verifyIdToken(token, true)
        uid = decoded.uid || null
      }
    }

    if (!uid) {
      const cookieStore = await cookies()
      const sessionCookie = cookieStore.get("firebase-session")?.value
      if (sessionCookie) {
        const decoded = await auth.verifySessionCookie(sessionCookie, true)
        uid = decoded.uid || null
      }
    }

    if (!uid) return { authorized: false, reason: "No auth token provided" }

    const db = getAdminDb()
    const profile = await db.collection("userProfiles").doc(uid).get()
    const role = profile.exists ? (profile.data()?.role as string | undefined) : undefined
    if (role === "admin" || role === "company_admin") return { authorized: true }

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

const TEMPLATE: EmailTemplateType = "member_invitation"

/**
 * Resend invitation emails for already-recorded invite docs.
 *
 * Body:
 * - organizationId?: string
 * - orgName?: string
 * - sinceIso?: string (optional; only invites createdAt >= sinceIso)
 * - limit?: number (default 200; max 1000)
 */
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
      organizationId?: string
      orgName?: string
      sinceIso?: string
      limit?: number
    }

    const limit = Math.min(Math.max(Number(body.limit || 200), 1), 1000)
    const organizationId = (body.organizationId || "").trim()
    const orgName = body.orgName || "Shift Scorecards"

    const db = getAdminDb()

    // Query invites
    let query: FirebaseFirestore.Query = db.collection("invites")
    if (organizationId) query = query.where("organizationId", "==", organizationId)
    query = query.where("status", "==", "pending")
    if (body.sinceIso) query = query.where("createdAt", ">=", body.sinceIso)
    query = query.limit(limit)

    const snap = await query.get()
    const emails = Array.from(
      new Set(
        snap.docs
          .map((d) => String(d.data()?.email || "").trim().toLowerCase())
          .filter((e) => e.includes("@")),
      ),
    )

    if (emails.length === 0) {
      return NextResponse.json({ resent: 0, message: "No pending invites found." })
    }

    const settings = await getEmailSettings()
    if (!settings?.enabled) {
      return NextResponse.json({ error: "Email is not configured or disabled" }, { status: 400 })
    }
    const apiKey = settings.resendApiKey || process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: "Resend API key not configured" }, { status: 500 })

    const fromEmail = settings.fromEmail && settings.fromEmail.includes("@") ? settings.fromEmail : ""
    const fromName = settings.fromName || "Shift Scorecards"
    if (!fromEmail) return NextResponse.json({ error: "From email not configured" }, { status: 500 })

    const template = await getEmailTemplate(TEMPLATE)
    if (!template.enabled) {
      return NextResponse.json({ error: `Template "${TEMPLATE}" is disabled` }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scorecard.envoydesign.com"
    const subject = await replacePlaceholders(template.subject, {
      "{{organizationName}}": orgName,
    })
    const html = await replacePlaceholders(template.body, {
      "{{organizationName}}": orgName,
      "{{inviteLink}}": appUrl,
    })

    const resend = new Resend(apiKey)
    const BATCH_SIZE = 100
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE).map((to) => ({
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

    return NextResponse.json({
      considered: snap.size,
      uniqueEmails: emails.length,
      sent,
      failed,
      errors,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

