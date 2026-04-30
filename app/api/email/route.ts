import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import type { EmailSettings, EmailTemplate, EmailTemplateType } from "@/lib/types"

// GET - Fetch email settings and/or templates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") // "settings" | "templates" | "template"
  const templateId = searchParams.get("templateId")

  try {
    const adminDb = getAdminDb()
    if (type === "settings") {
      const snap = await adminDb.collection("settings").doc("email_settings").get()
      return NextResponse.json(snap.exists ? snap.data() : null)
    }
    
    if (type === "template" && templateId) {
      const snap = await adminDb.collection("email_templates").doc(templateId).get()
      return NextResponse.json(snap.exists ? snap.data() : null)
    }
    
    if (type === "templates") {
      const snapshot = await adminDb.collection("email_templates").get()
      const templates: EmailTemplate[] = snapshot.docs.map((d) => d.data() as EmailTemplate)
      return NextResponse.json(templates)
    }
    
    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 })
  } catch (error) {
    // Keep response shapes stable so admin UI can still render defaults.
    if (type === "templates") {
      console.error("[api/email] Failed to load templates:", error)
      return NextResponse.json([] as EmailTemplate[], { status: 200 })
    }
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST - Save email settings or templates, or send test email
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action") // "save_settings" | "save_template" | "send_test"

  try {
    const adminDb = getAdminDb()
    const body = await request.json()
    
    if (action === "save_settings") {
      const settings = body as EmailSettings
      await adminDb.collection("settings").doc("email_settings").set({
        ...settings,
        updatedAt: new Date().toISOString(),
      })
      return NextResponse.json({ success: true })
    }
    
    if (action === "save_template") {
      const template = body as EmailTemplate
      await adminDb.collection("email_templates").doc(template.id).set({
        ...template,
        updatedAt: new Date().toISOString(),
      })
      return NextResponse.json({ success: true })
    }
    
    if (action === "send_test") {
      const { to, templateType, data } = body as {
        to: string
        templateType: EmailTemplateType
        data: Record<string, string>
      }
      
      // Get settings
      const settingsSnap = await adminDb.collection("settings").doc("email_settings").get()
      
      if (!settingsSnap.exists()) {
        return NextResponse.json({ error: "Email settings not configured" }, { status: 400 })
      }
      
      const settings = settingsSnap.data() as EmailSettings
      
      if (!settings.enabled) {
        return NextResponse.json({ error: "Email is disabled" }, { status: 400 })
      }
      
      // Get template
      const templateSnap = await adminDb.collection("email_templates").doc(templateType).get()
      
      // Use default if not saved
      const template = templateSnap.exists ? (templateSnap.data() as EmailTemplate) : getDefaultTemplate(templateType)
      
      // Replace placeholders
      let subject = template.subject
      let html = template.body
      for (const [key, value] of Object.entries(data)) {
        const escapedKey = key.replace(/[{}]/g, "\\$&")
        subject = subject.replace(new RegExp(escapedKey, "g"), value)
        html = html.replace(new RegExp(escapedKey, "g"), value)
      }
      
      // Send via Resend
      if (settings.provider === "resend") {
        if (!settings.resendApiKey) {
          return NextResponse.json({ error: "Resend API key not configured" }, { status: 400 })
        }
        
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${settings.resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${settings.fromName} <${settings.fromEmail}>`,
            to: [to],
            reply_to: settings.replyToEmail || settings.fromEmail,
            subject: `[TEST] ${subject}`,
            html,
          }),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          return NextResponse.json({ error: errorData.message || "Failed to send" }, { status: 500 })
        }
        
        return NextResponse.json({ success: true, message: `Test email sent to ${to}` })
      }
      
      return NextResponse.json({ error: "Only Resend provider is supported" }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 })
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
