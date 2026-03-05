export type UserRole = "admin" | "user"

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
}

export interface ScorecardQuestion {
  id: string
  text: string
  type: "scale" | "number" | "text"
  scaleMin?: number
  scaleMax?: number
  order: number
}

export interface ScorecardTemplate {
  id: string
  name: string
  description: string
  questions: ScorecardQuestion[]
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
  streak: number
  winNarrative?: string
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
