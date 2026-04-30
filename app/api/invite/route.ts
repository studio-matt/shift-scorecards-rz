import { Resend } from "resend"
import { NextResponse } from "next/server"
import { getEmailSettings, getEmailTemplate, replacePlaceholders } from "@/lib/email-service"

function redactEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return "***"
  const safeLocal = (local || "").slice(0, 1)
  return `${safeLocal}***@${domain}`
}

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
      console.error("[invite] blocked: missing Resend API key", {
        recipients: emails.length,
      })
      return NextResponse.json(
        { error: "Resend API key not configured" },
        { status: 500 },
      )
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
    const errors: string[] = []
    
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
          errors.push(String(result.error?.message || result.error))
        }
      } catch (batchErr) {
        console.error("[invite] Batch send failed:", batchErr)
        failed += batch.length
        errors.push(batchErr instanceof Error ? batchErr.message : String(batchErr))
      }
    }

    if (failed > 0) {
      console.error("[invite] send incomplete", {
        sent,
        failed,
        total: emails.length,
        fromEmail,
        sampleRecipients: emails.slice(0, 3).map(redactEmail),
      })
      return NextResponse.json(
        { error: "One or more invitation emails failed to send", sent, failed, total: emails.length, errors },
        { status: 502 },
      )
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
