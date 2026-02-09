export type UserRole = "admin" | "user"

export interface User {
  id: string
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

export interface ScorecardSession {
  id: string
  templateId: string
  scheduledAt: string
  scheduleType: "now" | "scheduled" | "recurring"
  recipients: string[]
  status: "draft" | "sent" | "completed"
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
  department: string
  avgScore: number
  streak: number
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
