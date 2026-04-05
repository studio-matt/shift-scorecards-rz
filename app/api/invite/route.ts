import { Resend } from "resend"
import { NextResponse } from "next/server"
import { getEmailSettings, getEmailTemplate, replacePlaceholders } from "@/lib/email-service"

export async function POST(req: Request) {
  try {
    const { emails, orgName } = await req.json()

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "No emails provided" }, { status: 400 })
    }

    // Get API key from Firestore email settings (or fallback to env var)
    const emailSettings = await getEmailSettings()
    const apiKey = emailSettings?.resendApiKey || process.env.RESEND_API_KEY
    
    if (!apiKey) {
      console.warn("[invite] No Resend API key found in settings or environment")
      return NextResponse.json({
        sent: 0,
        skipped: emails.length,
        message: "Emails skipped -- Resend API key not configured",
      })
    }

    const resend = new Resend(apiKey)
    
    // Determine from email - validate it looks like an email address
    const envFromEmail = process.env.RESEND_FROM_EMAIL
    const firestoreFromEmail = emailSettings?.fromEmail && emailSettings?.fromName
      ? `${emailSettings.fromName} <${emailSettings.fromEmail}>`
      : null
    
    // Use env var only if it contains @ (is an email), otherwise use Firestore or default
    const fromEmail = (envFromEmail && envFromEmail.includes("@"))
      ? envFromEmail
      : (firestoreFromEmail && firestoreFromEmail.includes("@"))
        ? firestoreFromEmail
        : "Shift Scorecards <noreply@envoydesign.com>"
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scorecards.envoydesign.com"
    
    // Get the invitation email template
    const template = await getEmailTemplate("member_invitation")
    const organizationName = orgName || "Shift Scorecards"
    
    // Prepare subject and body with placeholders replaced
    const subject = await replacePlaceholders(template.subject, {
      "{{organizationName}}": organizationName,
    })
    const html = await replacePlaceholders(template.body, {
      "{{organizationName}}": organizationName,
      "{{inviteLink}}": appUrl,
    })
    
    const results = await Promise.allSettled(
      emails.map((email: string) =>
        resend.emails.send({
          from: fromEmail,
          to: email,
          subject,
          html,
        }),
      ),
    )

    const sent = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    return NextResponse.json({ sent, failed, total: emails.length })
  } catch (err) {
    console.error("[invite] Error sending emails:", err)
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 },
    )
  }
}
