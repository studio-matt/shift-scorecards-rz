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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scorecard.envoydesign.com"
    
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
    
    // Use Resend Batch API - sends up to 100 emails per request
    // This avoids hitting the 5 req/s rate limit
    const batchEmails = emails.map((email: string) => ({
      from: fromEmail,
      to: email,
      subject,
      html,
    }))
    
    // Split into batches of 100 (Resend's batch limit)
    const BATCH_SIZE = 100
    let sent = 0
    let failed = 0
    
    for (let i = 0; i < batchEmails.length; i += BATCH_SIZE) {
      const batch = batchEmails.slice(i, i + BATCH_SIZE)
      try {
        const result = await resend.batch.send(batch)
        if (result.data) {
          sent += result.data.data.length
        }
        if (result.error) {
          console.error("[invite] Batch error:", result.error)
          failed += batch.length
        }
      } catch (batchErr) {
        console.error("[invite] Batch send failed:", batchErr)
        failed += batch.length
      }
    }

    return NextResponse.json({ sent, failed, total: emails.length })
  } catch (err) {
    console.error("[invite] Error sending emails:", err)
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 },
    )
  }
}
