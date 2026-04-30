"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Mail,
  Settings,
  FileText,
  Send,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  Link as LinkIcon,
  Eye,
  Code,
  Info,
} from "lucide-react"
import type { EmailSettings, EmailTemplate, EmailTemplateType, EmailProvider } from "@/lib/types"
import { EMAIL_PLACEHOLDERS } from "@/lib/types"

// Default templates for initial state
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

export default function EmailSettingsPage() {
  const [activeTab, setActiveTab] = useState("settings")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Email settings state
  const [settings, setSettings] = useState<EmailSettings>({
    id: "email_settings",
    provider: "resend",
    enabled: false,
    fromEmail: "",
    fromName: "",
    replyToEmail: "",
    resendApiKey: "",
    updatedAt: new Date().toISOString(),
    updatedBy: "",
  })

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<EmailTemplateType>("scorecard_posted")
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [sendingTest, setSendingTest] = useState(false)

  // Load settings and templates
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load settings
      const settingsRes = await fetch("/api/email?type=settings")
      const settingsData = await settingsRes.json()
      if (settingsData) {
        setSettings(settingsData)
      }

      // Load templates
      const templatesRes = await fetch("/api/email?type=templates")
      const templatesData = await templatesRes.json()
      const savedTemplates: EmailTemplate[] = Array.isArray(templatesData) ? templatesData : []
      if (!Array.isArray(templatesData)) {
        console.error("Unexpected templates response:", templatesData)
        setMessage({
          type: "error",
          text: "Could not load saved email templates from the server. Showing default templates.",
        })
      }
      
      // Merge with defaults
      const mergedTemplates: EmailTemplate[] = []
      for (const [id, defaultTemplate] of Object.entries(DEFAULT_TEMPLATES)) {
        const saved = savedTemplates.find((t: EmailTemplate) => t.id === id)
        if (saved) {
          mergedTemplates.push(saved)
        } else {
          mergedTemplates.push({
            ...defaultTemplate,
            updatedAt: new Date().toISOString(),
            updatedBy: "system",
          } as EmailTemplate)
        }
      }
      setTemplates(mergedTemplates)
      
      // Set initial editing template
      const initialTemplate = mergedTemplates.find(t => t.id === "scorecard_posted")
      if (initialTemplate) {
        setEditingTemplate(initialTemplate)
      }
    } catch (error) {
      console.error("Failed to load email settings:", error)
      // Always fall back to defaults so the UI never blanks out.
      const fallbackTemplates: EmailTemplate[] = Object.values(DEFAULT_TEMPLATES).map((t) => ({
        ...t,
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
      })) as EmailTemplate[]
      setTemplates(fallbackTemplates)
      const initialTemplate = fallbackTemplates.find((t) => t.id === "scorecard_posted")
      if (initialTemplate) setEditingTemplate(initialTemplate)
      setMessage({
        type: "error",
        text: "Failed to load email settings/templates. Showing default templates.",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle URL parameter for direct template navigation
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const templateParam = params.get("template")
      if (templateParam && Object.keys(DEFAULT_TEMPLATES).includes(templateParam)) {
        setSelectedTemplateId(templateParam as EmailTemplateType)
      }
    }
  }, [])

  // Update editing template when selection changes
  useEffect(() => {
    const template = templates.find(t => t.id === selectedTemplateId)
    if (template) {
      setEditingTemplate(template)
    }
  }, [selectedTemplateId, templates])

  // Save settings
  async function handleSaveSettings() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/email?action=save_settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error("Failed to save")
      setMessage({ type: "success", text: "Email settings saved successfully!" })
    } catch (error) {
      setMessage({ type: "error", text: `Failed to save: ${error}` })
    } finally {
      setSaving(false)
    }
  }

  // Save template
  async function handleSaveTemplate() {
    if (!editingTemplate) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/email?action=save_template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate),
      })
      if (!res.ok) throw new Error("Failed to save")
      
      // Update local state
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? editingTemplate : t))
      setMessage({ type: "success", text: "Template saved successfully!" })
    } catch (error) {
      setMessage({ type: "error", text: `Failed to save: ${error}` })
    } finally {
      setSaving(false)
    }
  }

  // Send test email
  async function handleSendTest() {
    if (!testEmail || !editingTemplate) return
    setSendingTest(true)
    setMessage(null)
    try {
      // First save the template
      await fetch("/api/email?action=save_template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate),
      })

      // Then send test
      const res = await fetch("/api/email?action=send_test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          templateType: editingTemplate.id,
          data: {
            "{{userName}}": "John Doe",
            "{{firstName}}": "John",
            "{{scorecardName}}": "Weekly AI Assessment",
            "{{scorecardLink}}": "https://example.com/scorecard/123",
            "{{dashboardLink}}": "https://example.com/dashboard",
            "{{dueDate}}": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            "{{hoursRemaining}}": "24",
            "{{score}}": "8.5",
            "{{weeklyScore}}": "8.2",
            "{{percentileRank}}": "85",
            "{{streak}}": "4",
            "{{organizationName}}": "Acme Corp",
          },
        }),
      })
      
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to send")
      setMessage({ type: "success", text: `Test email sent to ${testEmail}!` })
    } catch (error) {
      setMessage({ type: "error", text: `Failed to send test: ${error}` })
    } finally {
      setSendingTest(false)
    }
  }

  // Insert formatting into template body
  function insertFormatting(tag: string) {
    if (!editingTemplate) return
    
    let insertion = ""
    switch (tag) {
      case "bold":
        insertion = "<strong>bold text</strong>"
        break
      case "italic":
        insertion = "<em>italic text</em>"
        break
      case "h1":
        insertion = "<h1>Heading 1</h1>"
        break
      case "h2":
        insertion = "<h2>Heading 2</h2>"
        break
      case "h3":
        insertion = "<h3>Heading 3</h3>"
        break
      case "list":
        insertion = "<ul>\n<li>Item 1</li>\n<li>Item 2</li>\n</ul>"
        break
      case "link":
        insertion = '<a href="https://example.com">Link Text</a>'
        break
      case "button":
        insertion = '<p><a href="{{scorecardLink}}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Button Text</a></p>'
        break
    }
    
    setEditingTemplate({
      ...editingTemplate,
      body: editingTemplate.body + "\n" + insertion,
    })
  }

  // Insert placeholder
  function insertPlaceholder(placeholder: string) {
    if (!editingTemplate) return
    setEditingTemplate({
      ...editingTemplate,
      body: editingTemplate.body + placeholder,
    })
  }

  // Preview with sample data
  function getPreviewHtml() {
    if (!editingTemplate) return ""
    let html = editingTemplate.body
    const sampleData: Record<string, string> = {
      "{{userName}}": "John Doe",
      "{{firstName}}": "John",
      "{{scorecardName}}": "Weekly AI Assessment",
      "{{scorecardLink}}": "#",
      "{{dashboardLink}}": "#",
      "{{dueDate}}": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      "{{hoursRemaining}}": "24",
      "{{score}}": "8.5",
      "{{weeklyScore}}": "8.2",
      "{{percentileRank}}": "85",
      "{{streak}}": "4",
      "{{organizationName}}": "Acme Corp",
    }
    for (const [key, value] of Object.entries(sampleData)) {
      html = html.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value)
    }
    return html
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentPlaceholders = EMAIL_PLACEHOLDERS[selectedTemplateId] || []

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure email notifications and customize templates
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-4 ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/30 dark:bg-green-950/20 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Provider Settings
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
        </TabsList>

        {/* Provider Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Provider
              </CardTitle>
              <CardDescription>
                Configure your email sending provider. We recommend Resend for easy setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn on to send email notifications to users
                  </p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Email Provider</Label>
                <Select
                  value={settings.provider}
                  onValueChange={(value: EmailProvider) =>
                    setSettings({ ...settings, provider: value })
                  }
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resend">Resend (Recommended)</SelectItem>
                    <SelectItem value="smtp" disabled>SMTP (Coming Soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.provider === "resend" && (
                <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Get your API key from{" "}
                      <a
                        href="https://resend.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        resend.com
                      </a>
                      . Free tier includes 3,000 emails/month.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resend-api-key">Resend API Key</Label>
                    <Input
                      id="resend-api-key"
                      type="password"
                      placeholder="re_xxxxxxxx..."
                      value={settings.resendApiKey || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, resendApiKey: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    placeholder="Shift Scorecards"
                    value={settings.fromName}
                    onChange={(e) =>
                      setSettings({ ...settings, fromName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    type="email"
                    placeholder="noreply@yourdomain.com"
                    value={settings.fromEmail}
                    onChange={(e) =>
                      setSettings({ ...settings, fromEmail: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply-to">Reply-To Email (Optional)</Label>
                <Input
                  id="reply-to"
                  type="email"
                  placeholder="support@yourdomain.com"
                  value={settings.replyToEmail || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, replyToEmail: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Template List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Templates</CardTitle>
                <CardDescription>Select a template to edit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id as EmailTemplateType)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                      selectedTemplateId === template.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                    <Badge variant={template.enabled ? "default" : "secondary"}>
                      {template.enabled ? "On" : "Off"}
                    </Badge>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Template Editor */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{editingTemplate?.name}</CardTitle>
                    <CardDescription>{editingTemplate?.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="template-enabled" className="text-sm">
                      Enabled
                    </Label>
                    <Switch
                      id="template-enabled"
                      checked={editingTemplate?.enabled ?? true}
                      onCheckedChange={(checked) =>
                        editingTemplate &&
                        setEditingTemplate({ ...editingTemplate, enabled: checked })
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subject Line */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={editingTemplate?.subject ?? ""}
                    onChange={(e) =>
                      editingTemplate &&
                      setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                    }
                    placeholder="Email subject..."
                  />
                </div>

                {/* Formatting Toolbar */}
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/30 p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting("bold")}
                    title="Bold"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting("italic")}
                    title="Italic"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <div className="mx-1 h-6 w-px bg-border" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting("h1")}
                    title="Heading 1"
                  >
                    <Heading1 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting("h2")}
                    title="Heading 2"
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting("h3")}
                    title="Heading 3"
                  >
                    <Heading3 className="h-4 w-4" />
                  </Button>
                  <div className="mx-1 h-6 w-px bg-border" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting("list")}
                    title="List"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting("link")}
                    title="Link"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting("button")}
                    title="Button"
                  >
                    <span className="text-xs font-medium">BTN</span>
                  </Button>
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant={previewMode ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    {previewMode ? (
                      <>
                        <Code className="mr-1 h-4 w-4" />
                        Edit
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1 h-4 w-4" />
                        Preview
                      </>
                    )}
                  </Button>
                </div>

                {/* Body Editor / Preview */}
                {previewMode ? (
                  <div
                    className="min-h-[300px] rounded-lg border border-border bg-white p-4 dark:bg-zinc-950"
                    dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                  />
                ) : (
                  <Textarea
                    value={editingTemplate?.body ?? ""}
                    onChange={(e) =>
                      editingTemplate &&
                      setEditingTemplate({ ...editingTemplate, body: e.target.value })
                    }
                    placeholder="Email body (HTML)..."
                    className="min-h-[300px] font-mono text-sm"
                  />
                )}

                {/* Placeholders */}
                <div className="space-y-2">
                  <Label>Available Placeholders</Label>
                  <div className="flex flex-wrap gap-2">
                    {currentPlaceholders.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => insertPlaceholder(p.key)}
                        className="rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-xs text-foreground transition-colors hover:bg-muted"
                        title={p.description}
                      >
                        {p.key}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="test@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="w-48"
                    />
                    <Button
                      variant="outline"
                      onClick={handleSendTest}
                      disabled={!testEmail || sendingTest || !settings.enabled}
                    >
                      {sendingTest ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Test
                        </>
                      )}
                    </Button>
                  </div>
                  <Button onClick={handleSaveTemplate} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Template
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
