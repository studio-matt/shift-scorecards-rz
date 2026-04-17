"use server"

import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore"
import type { EmailSettings, EmailTemplate, EmailTemplateType, User } from "@/lib/types"

// Default email templates
const DEFAULT_TEMPLATES: Record<EmailTemplateType, Omit<EmailTemplate, "updatedAt" | "updatedBy">> = {
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
  },
  weekly_digest: {
    id: "weekly_digest",
    name: "Weekly Digest",
    description: "Weekly summary of personal performance and progress",
    subject: "Your Weekly Progress Report - {{weekOf}}",
    body: `<h1>Hi {{firstName}},</h1>
<p>Here's your weekly performance summary:</p>
<ul>
<li><strong>Hours Saved:</strong> {{hoursSaved}} hours</li>
<li><strong>Current Streak:</strong> {{streak}} weeks</li>
<li><strong>Rank:</strong> #{{rank}} in your organization</li>
</ul>
<p>View your full dashboard for more insights:</p>
<p><a href="{{dashboardLink}}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Dashboard</a></p>
<p>Keep improving!<br/>{{organizationName}}</p>`,
    enabled: true,
  },
  leadership_report: {
    id: "leadership_report",
    name: "Leadership Report",
    description: "Weekly organization performance report for leadership",
    subject: "Weekly Leadership Report - {{organizationName}} - {{weekOf}}",
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
<h1 style="color: #111; margin-bottom: 24px;">Weekly Leadership Report</h1>
<p style="color: #555; margin-bottom: 8px;"><strong>Organization:</strong> {{organizationName}}</p>
<p style="color: #555; margin-bottom: 24px;"><strong>Week of:</strong> {{weekOf}}</p>

<div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
<h2 style="color: #111; font-size: 16px; margin-bottom: 16px;">Key Metrics</h2>
<table style="width: 100%; border-collapse: collapse;">
<tr><td style="padding: 8px 0; color: #555;">Total Hours Saved</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111;">{{totalHoursSaved}}</td></tr>
<tr><td style="padding: 8px 0; color: #555;">Productivity Gain</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111;">{{productivityGain}}%</td></tr>
<tr><td style="padding: 8px 0; color: #555;">Participation Rate</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111;">{{participationRate}}%</td></tr>
<tr><td style="padding: 8px 0; color: #555;">Value Created</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111;">\${{periodValue}}</td></tr>
</table>
</div>

<div style="margin-bottom: 24px;">
<h2 style="color: #111; font-size: 16px; margin-bottom: 12px;">Top Performers</h2>
{{topPerformersList}}
</div>

<div style="margin-bottom: 24px;">
<h2 style="color: #111; font-size: 16px; margin-bottom: 12px;">Engagement Alerts</h2>
<p style="color: #555;">Non-responders this week: <strong>{{nonRespondersCount}}</strong></p>
{{nonRespondersList}}
</div>

<p><a href="{{reportLink}}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">View Full Report</a></p>
</div>`,
    enabled: true,
  },
  member_invitation: {
    id: "member_invitation",
    name: "Member Invitation",
    description: "Sent when inviting new members to join the organization",
    subject: "You've been invited to {{organizationName}}",
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
<h1 style="color: #111; margin-bottom: 8px;">You're invited!</h1>
<p style="color: #555; line-height: 1.6;">
You've been invited to join <strong>{{organizationName}}</strong>. Click the link below to create your account and get started.
</p>
<p><a href="{{inviteLink}}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">Accept Invitation</a></p>
<p style="color: #999; font-size: 13px; margin-top: 32px;">
If you didn't expect this invitation, you can safely ignore this email.
</p>
</div>`,
    enabled: true,
  },
  password_reset: {
    id: "password_reset",
    name: "Password Reset",
    description: "Sent when a user requests to reset their password",
    subject: "Reset Your Password",
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
<h1 style="color: #111; margin-bottom: 8px;">Reset Your Password</h1>
<p style="color: #555; line-height: 1.6;">
Hi {{firstName}}, we received a request to reset your password. Click the button below to create a new password.
</p>
<p><a href="{{resetLink}}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">Reset Password</a></p>
<p style="color: #999; font-size: 13px; margin-top: 32px;">
If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.
</p>
</div>`,
    enabled: true,
  },
}

// Get email settings from Firestore
export async function getEmailSettings(): Promise<EmailSettings | null> {
  const docRef = doc(db, "settings", "email_settings")
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return docSnap.data() as EmailSettings
  }
  return null
}

// Save email settings to Firestore
export async function saveEmailSettings(settings: EmailSettings): Promise<void> {
  const docRef = doc(db, "settings", "email_settings")
  await setDoc(docRef, settings)
}

// Get all email templates
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const templatesRef = collection(db, "email_templates")
  const snapshot = await getDocs(templatesRef)
  
  const savedTemplates = new Map<string, EmailTemplate>()
  snapshot.forEach((doc) => {
    savedTemplates.set(doc.id, doc.data() as EmailTemplate)
  })
  
  // Merge with defaults (use saved if exists, otherwise default)
  const allTemplates: EmailTemplate[] = []
  for (const [id, defaultTemplate] of Object.entries(DEFAULT_TEMPLATES)) {
    const saved = savedTemplates.get(id)
    if (saved) {
      allTemplates.push(saved)
    } else {
      allTemplates.push({
        ...defaultTemplate,
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
      })
    }
  }
  
  return allTemplates
}

// Get a specific email template
export async function getEmailTemplate(templateId: EmailTemplateType): Promise<EmailTemplate> {
  const docRef = doc(db, "email_templates", templateId)
  const docSnap = await getDoc(docRef)
  
  if (docSnap.exists()) {
    return docSnap.data() as EmailTemplate
  }
  
  // Return default
  const defaultTemplate = DEFAULT_TEMPLATES[templateId]
  return {
    ...defaultTemplate,
    updatedAt: new Date().toISOString(),
    updatedBy: "system",
  }
}

// Save email template
export async function saveEmailTemplate(template: EmailTemplate): Promise<void> {
  const docRef = doc(db, "email_templates", template.id)
  await setDoc(docRef, template)
}

// Replace placeholders in template (async for Server Actions compatibility)
export async function replacePlaceholders(
  content: string,
  data: Record<string, string>
): Promise<string> {
  let result = content
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value)
  }
  return result
}

// Send email using configured provider
export async function sendEmail({
  to,
  templateType,
  data,
}: {
  to: string | string[]
  templateType: EmailTemplateType
  data: Record<string, string>
}): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getEmailSettings()
    if (!settings || !settings.enabled) {
      return { success: false, error: "Email is not configured or disabled" }
    }
    
    const template = await getEmailTemplate(templateType)
    if (!template.enabled) {
      return { success: false, error: `Template "${templateType}" is disabled` }
    }
    
    const subject = await replacePlaceholders(template.subject, data)
    const html = await replacePlaceholders(template.body, data)
    
    const recipients = Array.isArray(to) ? to : [to]
    
    if (settings.provider === "resend") {
      if (!settings.resendApiKey) {
        return { success: false, error: "Resend API key not configured" }
      }
      
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${settings.fromName} <${settings.fromEmail}>`,
          to: recipients,
          reply_to: settings.replyToEmail || settings.fromEmail,
          subject,
          html,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.message || "Failed to send via Resend" }
      }
      
      return { success: true }
    } else if (settings.provider === "smtp") {
      // For SMTP, we'd need nodemailer or similar
      // This would be implemented server-side
      return { success: false, error: "SMTP not yet implemented - use Resend" }
    }
    
    return { success: false, error: "Unknown email provider" }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Send scorecard notification to multiple users
export async function sendScorecardNotifications({
  users,
  scorecardName,
  scorecardLink,
  dueDate,
  organizationName,
}: {
  users: User[]
  scorecardName: string
  scorecardLink: string
  dueDate: string
  organizationName: string
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] }
  
  for (const user of users) {
    const result = await sendEmail({
      to: user.email,
      templateType: "scorecard_posted",
      data: {
        "{{userName}}": `${user.firstName} ${user.lastName}`,
        "{{firstName}}": user.firstName,
        "{{scorecardName}}": scorecardName,
        "{{scorecardLink}}": scorecardLink,
        "{{dueDate}}": dueDate,
        "{{organizationName}}": organizationName,
      },
    })
    
    if (result.success) {
      results.sent++
    } else {
      results.failed++
      results.errors.push(`${user.email}: ${result.error}`)
    }
  }
  
  return results
}
