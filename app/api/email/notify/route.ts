import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import type { EmailSettings, EmailTemplate, EmailTemplateType } from "@/lib/types"

interface Recipient {
  email: string
  firstName: string
  lastName: string
}

// POST - Send email notifications to multiple recipients
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateType, recipients, data } = body as {
      templateType: EmailTemplateType
      recipients: Recipient[]
      data: Record<string, string>
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: "No recipients provided" }, { status: 400 })
    }

    // Get email settings
    const settingsRef = doc(db, "settings", "email_settings")
    const settingsSnap = await getDoc(settingsRef)

    if (!settingsSnap.exists()) {
      return NextResponse.json({ 
        success: false, 
        sent: 0, 
        failed: recipients.length,
        message: "Email settings not configured" 
      })
    }

    const settings = settingsSnap.data() as EmailSettings

    if (!settings.enabled) {
      return NextResponse.json({ 
        success: false, 
        sent: 0, 
        failed: recipients.length,
        message: "Email notifications are disabled" 
      })
    }

    if (settings.provider !== "resend" || !settings.resendApiKey) {
      return NextResponse.json({ 
        success: false, 
        sent: 0, 
        failed: recipients.length,
        message: "Email provider not configured" 
      })
    }

    // Get template
    const templateRef = doc(db, "email_templates", templateType)
    const templateSnap = await getDoc(templateRef)
    
    const template: EmailTemplate = templateSnap.exists() 
      ? templateSnap.data() as EmailTemplate 
      : getDefaultTemplate(templateType)

    if (!template.enabled) {
      return NextResponse.json({ 
        success: false, 
        sent: 0, 
        failed: recipients.length,
        message: `Template "${templateType}" is disabled` 
      })
    }

    // Send emails to each recipient
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const recipient of recipients) {
      try {
        // Build personalized data for this recipient
        const personalizedData: Record<string, string> = {
          ...data,
          "{{userName}}": `${recipient.firstName} ${recipient.lastName}`,
          "{{firstName}}": recipient.firstName,
        }

        // Replace placeholders in subject and body
        let subject = template.subject
        let html = template.body

        for (const [key, value] of Object.entries(personalizedData)) {
          const escapedKey = key.replace(/[{}]/g, "\\$&")
          subject = subject.replace(new RegExp(escapedKey, "g"), value)
          html = html.replace(new RegExp(escapedKey, "g"), value)
        }

        // Send via Resend
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${settings.resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${settings.fromName} <${settings.fromEmail}>`,
            to: [recipient.email],
            reply_to: settings.replyToEmail || settings.fromEmail,
            subject,
            html,
          }),
        })

        if (response.ok) {
          sent++
        } else {
          const errorData = await response.json()
          failed++
          errors.push(`${recipient.email}: ${errorData.message || "Unknown error"}`)
        }
      } catch (err) {
        failed++
        errors.push(`${recipient.email}: ${String(err)}`)
      }
    }

    return NextResponse.json({
      success: sent > 0,
      sent,
      failed,
      total: recipients.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined, // Only return first 5 errors
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// Default templates
function getDefaultTemplate(templateId: EmailTemplateType): EmailTemplate {
  const defaults: Record<EmailTemplateType, EmailTemplate> = {
    scorecard_posted: {
      id: "scorecard_posted",
      name: "Scorecard Posted",
      description: "Sent when a new scorecard is assigned to a user",
      subject: "New Scorecard Available: {{scorecardName}}",
      body: `<h1>Hi {{firstName}},</h1>
<p>A new scorecard has been posted for you to complete.</p>
<p><strong>Scorecard:</strong> {{scorecardName}}</p>
<p><strong>Due Date:</strong> {{dueDate}}</p>
<p>Please take a few minutes to complete your self-assessment by clicking the button below:</p>
<p><a href="{{scorecardLink}}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Complete Scorecard</a></p>
<p>Thank you,<br/>{{organizationName}}</p>`,
      enabled: true,
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    },
    scorecard_reminder: {
      id: "scorecard_reminder",
      name: "Scorecard Reminder",
      description: "Reminder sent before scorecard deadline",
      subject: "Reminder: {{scorecardName}} due in {{hoursRemaining}} hours",
      body: `<h1>Hi {{firstName}},</h1>
<p>This is a friendly reminder that your scorecard is due soon.</p>
<p><strong>Scorecard:</strong> {{scorecardName}}</p>
<p><strong>Time Remaining:</strong> {{hoursRemaining}} hours</p>
<p>Please complete it before the deadline:</p>
<p><a href="{{scorecardLink}}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Complete Now</a></p>
<p>Thank you,<br/>{{organizationName}}</p>`,
      enabled: true,
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    },
    scorecard_completed: {
      id: "scorecard_completed",
      name: "Scorecard Completed",
      description: "Confirmation sent after completing a scorecard",
      subject: "Scorecard Completed: {{scorecardName}}",
      body: `<h1>Great job, {{firstName}}!</h1>
<p>You've successfully completed your scorecard.</p>
<p><strong>Scorecard:</strong> {{scorecardName}}</p>
<p><strong>Your Score:</strong> {{score}}</p>
<p>View your full results and track your progress on your dashboard:</p>
<p><a href="{{dashboardLink}}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Dashboard</a></p>
<p>Keep up the great work!<br/>{{organizationName}}</p>`,
      enabled: true,
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    },
    weekly_digest: {
      id: "weekly_digest",
      name: "Weekly Digest",
      description: "Weekly summary of performance and progress",
      subject: "Your Weekly Progress Report",
      body: `<h1>Hi {{firstName}},</h1>
<p>Here's your weekly performance summary:</p>
<ul>
<li><strong>Weekly Score:</strong> {{weeklyScore}}</li>
<li><strong>Percentile Rank:</strong> Top {{percentileRank}}%</li>
<li><strong>Current Streak:</strong> {{streak}} weeks</li>
</ul>
<p>View your full dashboard for more insights:</p>
<p><a href="{{dashboardLink}}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Dashboard</a></p>
<p>Keep improving!<br/>{{organizationName}}</p>`,
      enabled: false,
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    },
  }

  return defaults[templateId]
}
