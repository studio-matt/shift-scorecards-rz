export type UserRole = "admin" | "company_admin" | "user"

export interface NotificationPreferences {
  // Scorecard notifications
  scorecardPosted: boolean      // New scorecard is available
  scorecardReminder: boolean    // Reminder to complete scorecard
  // Personal progress
  weeklyDigest: boolean         // Weekly summary of personal progress
  // Leadership notifications (for admins/company_admins)
  leadershipReport: boolean     // Weekly org/company performance report
  nonResponderAlerts: boolean   // Alert when participation drops
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  scorecardPosted: true,
  scorecardReminder: true,
  weeklyDigest: true,
  leadershipReport: true,
  nonResponderAlerts: false, // Off by default - admin controls when to enable
}

export interface ReportSchedule {
  enabled: boolean
  reportType: "leadership" | "digest" | "both"
  frequency: "weekly" | "biweekly" | "monthly" | "specific_date"
  dayOfWeek?: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
  timeOfDay: string // HH:MM format in user's timezone
  specificDate?: string // ISO date for one-time reports
  timezone: string
  lastSentAt?: string
  nextScheduledAt?: string
}

export const DEFAULT_REPORT_SCHEDULE: ReportSchedule = {
  enabled: false,
  reportType: "leadership",
  frequency: "weekly",
  dayOfWeek: "monday",
  timeOfDay: "09:00",
  timezone: "America/Los_Angeles",
}

export interface ReportHistory {
  id: string
  userId: string
  organizationId: string
  reportType: "leadership" | "digest" | "non_responder_alert"
  weekOf: string
  generatedAt: string
  sentTo: string[] // email addresses
  metrics: {
    totalHoursSaved: number
    productivityGain: number
    participationRate: number
    topPerformersCount: number
    nonRespondersCount: number
  }
  status: "sent" | "failed" | "pending"
  errorMessage?: string
}

export interface User {
  id: string
  authId?: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  department: string
  jobTitle: string
  phone: string
  avatar?: string
  organizationId: string
  excludeFromReporting?: boolean
  notificationPreferences?: NotificationPreferences
  reportSchedule?: ReportSchedule
  timezone?: string
  createdAt: string
  lastLogin: string
}

export interface Organization {
  id: string
  name: string
  departments: string[]
  createdAt: string
  website?: string
  contactEmail?: string
  industry?: string
  memberCount?: number
  // Branding
  accentColor?: string
  backgroundColor?: string
  buttonColor?: string
  buttonFontColor?: string
  logoUrl?: string
  // Financial settings
  hourlyRate?: number // Default is $100/hr if not set
  // Reporting preferences
  reportingPreferences?: {
    anonymizeByDefault?: boolean
    includeInBenchmarking?: boolean
    scorecardCadence?: "weekly" | "biweekly" | "monthly"
    autoReminders?: boolean
  }
}

export interface ScorecardQuestion {
  id: string
  text: string
  type: "scale" | "number" | "text" | "multichoice" | "confidence" | "win" | "goals" | "time_saving"
  scaleMin?: number
  scaleMax?: number
  options?: { label: string; value: string }[] // For multichoice questions (A, B, C, etc.)
  order: number
}

// Question type meanings:
// - time_saving: Scale 0-10 representing minutes saved (0 min to 60+ min) - ONLY this type is used for Hours Saved calculations
// - confidence: Always 1-10 scale, used for confidence metrics
// - scale: Generic 1-10 scale for other ratings (NOT used in hours saved)
// - number: Numeric input (e.g., "how many meetings") - NOT used in hours saved
// - win: Text answer that captures "biggest win" - shown in Win of the Month section
// - goals: Text answer for goals - shown in Weekly Goals section with completion tracking

export interface ScorecardTemplate {
  id: string
  name: string
  description: string
  questions: ScorecardQuestion[]
  version?: string
  createdBy: string
  createdAt: string
  customLogic?: string
}

export interface ScorecardResponse {
  id: string
  templateId: string
  userId: string
  answers: Record<string, number | string>
  completedAt: string
  weekOf: string
}

export interface ScorecardRelease {
  id: string
  templateId: string
  templateName: string
  organizationId: string
  organizationName: string
  department: string // "all" or specific department
  scheduleType: "now" | "scheduled" | "recurring"
  scheduledAt: string // ISO date for when to send
  activeFrom: string // ISO date when scorecard becomes active
  activeUntil: string // ISO date when scorecard expires
  recurringFrequency?: "weekly" | "biweekly" | "monthly"
  recipientCount: number
  responseCount: number
  reminders?: {
    hoursBefore: number
    label: string
    scheduledFor: string
    sent: boolean
  }[]
  status: "scheduled" | "active" | "paused" | "completed" | "expired"
  createdAt: string
  createdBy: string
}

export interface DepartmentPerformance {
  department: string
  avgScore: number
  participants: number
  trend: number
}

export interface TopPerformer {
  id: string
  name: string
  company: string
  companyId: string
  department: string
  avgScore: number
  percentVsField: number // % above/below field average
  streak: number
  winNarrative?: string
  goalNarrative?: string
}

export interface WeeklyTrend {
  week: string
  score: number
}

export interface QuestionResult {
  question: string
  score: number
  change: number
}

export interface GlobalSettings {
  id: string // "global"
  branding: {
    accentColor: string
    backgroundColor: string
    buttonColor: string
    buttonFontColor: string
  }
  updatedAt: string
  updatedBy: string
}

// Email System Types
export type EmailProvider = "resend" | "smtp"

export interface EmailSettings {
  id: string // "email_settings"
  provider: EmailProvider
  enabled: boolean
  // Resend config
  resendApiKey?: string
  // SMTP config
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPassword?: string
  smtpSecure?: boolean
  // Common
  fromEmail: string
  fromName: string
  replyToEmail?: string
  updatedAt: string
  updatedBy: string
}

export type EmailTemplateType =
  | "scorecard_posted"
  | "scorecard_reminder"
  | "scorecard_completed"
  | "weekly_digest"
  | "leadership_report"
  | "non_responder_alert"
  | "member_invitation"
  | "password_reset"

export interface EmailTemplate {
  id: EmailTemplateType
  name: string
  description: string
  subject: string
  body: string // HTML content with placeholders like {{userName}}, {{scorecardLink}}
  enabled: boolean
  updatedAt: string
  updatedBy: string
}

// Available placeholders for email templates
export const EMAIL_PLACEHOLDERS = {
  scorecard_posted: [
    { key: "{{userName}}", description: "Recipient's full name" },
    { key: "{{firstName}}", description: "Recipient's first name" },
    { key: "{{scorecardName}}", description: "Name of the scorecard template" },
    { key: "{{scorecardLink}}", description: "Direct link to fill out the scorecard" },
    { key: "{{dueDate}}", description: "Scorecard due date" },
    { key: "{{organizationName}}", description: "Organization name" },
  ],
  scorecard_reminder: [
    { key: "{{userName}}", description: "Recipient's full name" },
    { key: "{{firstName}}", description: "Recipient's first name" },
    { key: "{{scorecardName}}", description: "Name of the scorecard template" },
    { key: "{{scorecardLink}}", description: "Direct link to fill out the scorecard" },
    { key: "{{dueDate}}", description: "Scorecard due date" },
    { key: "{{hoursRemaining}}", description: "Hours until deadline" },
    { key: "{{organizationName}}", description: "Organization name" },
  ],
  scorecard_completed: [
    { key: "{{userName}}", description: "Recipient's full name" },
    { key: "{{firstName}}", description: "Recipient's first name" },
    { key: "{{scorecardName}}", description: "Name of the scorecard template" },
    { key: "{{dashboardLink}}", description: "Link to their dashboard" },
    { key: "{{score}}", description: "Their hours saved this period" },
    { key: "{{organizationName}}", description: "Organization name" },
  ],
  weekly_digest: [
    { key: "{{userName}}", description: "Recipient's full name" },
    { key: "{{firstName}}", description: "Recipient's first name" },
    { key: "{{dashboardLink}}", description: "Link to their dashboard" },
    { key: "{{weeklyScore}}", description: "Their weekly hours saved" },
    { key: "{{percentileRank}}", description: "Their percentile ranking" },
    { key: "{{streak}}", description: "Current completion streak" },
    { key: "{{organizationName}}", description: "Organization name" },
  ],
  member_invitation: [
    { key: "{{organizationName}}", description: "Organization name" },
    { key: "{{inviteLink}}", description: "Link to accept the invitation" },
  ],
  password_reset: [
    { key: "{{userName}}", description: "Recipient's full name" },
    { key: "{{firstName}}", description: "Recipient's first name" },
    { key: "{{resetLink}}", description: "Link to reset password" },
  ],
  leadership_report: [
    { key: "{{organizationName}}", description: "Organization name" },
    { key: "{{weekOf}}", description: "Week of the report" },
    { key: "{{totalHoursSaved}}", description: "Total hours saved" },
    { key: "{{productivityGain}}", description: "Productivity gain percentage" },
    { key: "{{participationRate}}", description: "Participation rate percentage" },
    { key: "{{periodValue}}", description: "Dollar value created" },
    { key: "{{topPerformersList}}", description: "HTML list of top performers" },
    { key: "{{nonRespondersCount}}", description: "Number of non-responders" },
    { key: "{{nonRespondersList}}", description: "HTML list of non-responders" },
    { key: "{{reportLink}}", description: "Link to full report" },
  ],
  non_responder_alert: [
    { key: "{{organizationName}}", description: "Organization name" },
    { key: "{{weekOf}}", description: "Week of the alert" },
    { key: "{{nonRespondersCount}}", description: "Number of non-responders" },
    { key: "{{participationRate}}", description: "Current participation rate" },
    { key: "{{nonRespondersList}}", description: "HTML list of non-responders with names/departments" },
    { key: "{{dashboardLink}}", description: "Link to admin dashboard" },
  ],
} as const
