import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { verifyCallerIsAdmin } from "@/lib/verify-admin-request"
import { getEmailSettings, getEmailTemplate, replacePlaceholders } from "@/lib/email-service"
import { Resend } from "resend"
import type { EmailTemplateType } from "@/lib/types"

const USERS = "users"
const ORGS = "organizations"
const TEMPLATE: EmailTemplateType = "member_invitation"

export async function POST(request: NextRequest) {
  const authz = await verifyCallerIsAdmin(request)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const body = (await request.json().catch(() => ({}))) as { userIds?: string[] }
  const userIds = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : []
  if (userIds.length === 0) {
    return NextResponse.json({ error: "userIds is required" }, { status: 400 })
  }

  const db = getAdminDb()

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

  // Load org names for personalization
  const orgsSnap = await db.collection(ORGS).get()
  const orgNameById = new Map<string, string>()
  for (const d of orgsSnap.docs) {
    const name = String(d.data()?.name || "").trim()
    orgNameById.set(d.id, name || d.id)
  }

  // Load users
  const docs = await Promise.all(userIds.map((id) => db.collection(USERS).doc(id).get()))
  const pending = docs
    .filter((s) => s.exists)
    .map((s) => ({ id: s.id, data: s.data() as Record<string, unknown> }))
    .filter((u) => !u.data.authId) // only pending

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scorecard.envoydesign.com"
  const resend = new Resend(apiKey)

  // Group by org so subject/body can include orgName correctly
  const byOrg = new Map<string, string[]>() // orgId -> emails
  for (const u of pending) {
    const email = String(u.data.email || "").trim().toLowerCase()
    if (!email.includes("@")) continue
    const orgId = String(u.data.organizationId || "").trim()
    const set = byOrg.get(orgId) || []
    if (!set.includes(email)) set.push(email)
    byOrg.set(orgId, set)
  }

  let sent = 0
  let failed = 0
  const errors: string[] = []
  const BATCH_SIZE = 100

  for (const [orgId, emails] of byOrg.entries()) {
    const organizationName = orgNameById.get(orgId) || "Shift Scorecards"
    const subject = await replacePlaceholders(template.subject, {
      "{{organizationName}}": organizationName,
    })
    const html = await replacePlaceholders(template.body, {
      "{{organizationName}}": organizationName,
      "{{inviteLink}}": appUrl,
    })

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
  }

  return NextResponse.json({ success: failed === 0, sent, failed, errors })
}

