import { Resend } from "resend"
import { NextResponse } from "next/server"
import { getEmailSettings } from "@/lib/email-service"

export async function POST(req: Request) {
  try {
    const { emails, orgName } = await req.json()

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "No emails provided" }, { status: 400 })
    }

    // Get API key from Firestore email settings (or fallback to env var)
    const emailSettings = await getEmailSettings()
    console.log("[v0] emailSettings from Firestore:", emailSettings ? "found" : "not found", emailSettings?.resendApiKey ? "has API key" : "no API key")
    console.log("[v0] RESEND_API_KEY env var:", process.env.RESEND_API_KEY ? "set" : "not set")
    
    const apiKey = emailSettings?.resendApiKey || process.env.RESEND_API_KEY
    
    if (!apiKey) {
      console.warn("[invite] No Resend API key found in settings or environment")
      return NextResponse.json({
        sent: 0,
        skipped: emails.length,
        message: "Emails skipped -- Resend API key not configured",
      })
    }
    
    console.log("[v0] Using API key from:", emailSettings?.resendApiKey ? "Firestore" : "env var")

    const resend = new Resend(apiKey)
    
    // Use configured from address from settings, or fallback
    const fromEmail = emailSettings?.fromEmail && emailSettings?.fromName
      ? `${emailSettings.fromName} <${emailSettings.fromEmail}>`
      : process.env.RESEND_FROM_EMAIL || "Shift Scorecards <onboarding@resend.dev>"
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scorecards.envoydesign.com"
    
    console.log("[v0] Sending to emails:", emails)
    console.log("[v0] From address:", fromEmail)
    
    const results = await Promise.allSettled(
      emails.map((email: string) =>
        resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `You've been invited to ${orgName || "Shift Scorecards"}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="color: #111; margin-bottom: 8px;">You're invited!</h2>
              <p style="color: #555; line-height: 1.6;">
                You've been invited to join <strong>${orgName || "Shift Scorecards"}</strong>.
                Click the link below to create your account and get started.
              </p>
              <a href="${appUrl}"
                 style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Accept Invitation
              </a>
              <p style="color: #999; font-size: 13px; margin-top: 32px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          `,
        }),
      ),
    )

    // Log detailed results from Resend
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`[v0] Email ${index + 1} result:`, JSON.stringify(result.value))
      } else {
        console.log(`[v0] Email ${index + 1} FAILED:`, result.reason)
      }
    })

    const sent = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length
    
    console.log(`[v0] Final: sent=${sent}, failed=${failed}, total=${emails.length}`)

    return NextResponse.json({ sent, failed, total: emails.length })
  } catch (err) {
    console.error("[invite] Error sending emails:", err)
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 },
    )
  }
}
