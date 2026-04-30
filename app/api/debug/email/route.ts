import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import type { EmailSettings, EmailTemplate, EmailTemplateType } from "@/lib/types"
import { sendEmail } from "@/lib/email-service"

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.DEBUG_SECRET
  if (!secret) return false
  const auth = req.headers.get("authorization") || ""
  return auth === `Bearer ${secret}`
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401)

  try {
    const adminDb = getAdminDb()

    const settingsSnap = await adminDb
      .collection("settings")
      .doc("email_settings")
      .get()
    const settings = settingsSnap.exists
      ? (settingsSnap.data() as EmailSettings)
      : null

    const templatesSnap = await adminDb.collection("email_templates").get()
    const templates = templatesSnap.docs.map((d) => d.data() as EmailTemplate)
    const templateIndex = new Map<string, EmailTemplate>()
    for (const t of templates) templateIndex.set(t.id, t)

    const envResendApiKey = process.env.RESEND_API_KEY || ""
    const envFromEmail = process.env.RESEND_FROM_EMAIL || ""

    const templateTypes: EmailTemplateType[] = [
      "scorecard_posted",
      "scorecard_reminder",
      "scorecard_completed",
      "weekly_digest",
      "leadership_report",
      "non_responder_alert",
      "member_invitation",
      "password_reset",
    ]

    const templatesStatus = templateTypes.map((id) => {
      const t = templateIndex.get(id)
      return {
        id,
        exists: !!t,
        enabled: t?.enabled ?? null,
        hasSubject: !!t?.subject?.trim(),
        hasBody: !!t?.body?.trim(),
      }
    })

    return json({
      ok: true,
      settings: {
        exists: !!settings,
        enabled: settings?.enabled ?? null,
        provider: settings?.provider ?? null,
        hasResendApiKey: !!settings?.resendApiKey,
        fromEmailPresent: !!settings?.fromEmail,
        fromNamePresent: !!settings?.fromName,
        replyToPresent: !!settings?.replyToEmail,
      },
      env: {
        hasResendApiKey: !!envResendApiKey,
        hasFromEmail: !!envFromEmail && envFromEmail.includes("@"),
      },
      templates: {
        count: templates.length,
        status: templatesStatus,
      },
    })
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401)

  try {
    const body = (await req.json().catch(() => ({}))) as {
      to?: string
      templateType?: EmailTemplateType
      data?: Record<string, string>
    }

    const to = (body.to || "").trim()
    const templateType = body.templateType || "password_reset"
    const data = body.data || {
      "{{userName}}": "Test User",
      "{{firstName}}": "Test",
      "{{scorecardName}}": "Test Scorecard",
      "{{scorecardLink}}": "https://example.com",
      "{{dashboardLink}}": "https://example.com",
      "{{dueDate}}": new Date().toLocaleDateString(),
      "{{hoursRemaining}}": "24",
      "{{score}}": "8.5",
      "{{weeklyScore}}": "8.2",
      "{{percentileRank}}": "85",
      "{{streak}}": "4",
      "{{organizationName}}": "Test Org",
      "{{weekOf}}": new Date().toLocaleDateString(),
      "{{hoursSaved}}": "12",
      "{{rank}}": "1",
      "{{totalHoursSaved}}": "120",
      "{{productivityGain}}": "18",
      "{{participationRate}}": "74",
      "{{periodValue}}": "25000",
      "{{topPerformersList}}": "<p>1. Test User — 8.5</p>",
      "{{nonRespondersCount}}": "0",
      "{{nonRespondersList}}": "<p>Everyone responded!</p>",
      "{{reportLink}}": "https://example.com",
      "{{settingsLink}}": "https://example.com",
      "{{inviteLink}}": "https://example.com",
      "{{resetLink}}": "https://example.com",
    }

    if (!to || !to.includes("@")) {
      return json({ error: "Provide a valid `to` email." }, 400)
    }

    const result = await sendEmail({ to, templateType, data })
    return json({ ok: result.success, ...result })
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
}

