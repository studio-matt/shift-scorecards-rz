import { getDocuments, getOrganizations, COLLECTIONS } from "./firestore"
import type {
  WeeklyTrend,
  DepartmentPerformance,
  TopPerformer,
  QuestionResult,
} from "./types"

// ── Raw response shape from Firestore ─────────────────────────────────
interface RawResponse {
  id: string
  templateId: string
  releaseId: string
  userId: string
  userName: string
  organizationId: string
  department: string
  answers: Record<string, number | string>
  completedAt: string
  weekOf: string
  weekDate: string
}

// ── Fetch all responses (optionally filtered) ─────────────────────────
export async function fetchAllResponses(
  orgId?: string,
  department?: string,
): Promise<RawResponse[]> {
  const docs = await getDocuments(COLLECTIONS.RESPONSES)
  let responses = docs.map((d) => ({ ...d } as unknown as RawResponse))

  if (orgId && orgId !== "all") {
    responses = responses.filter((r) => r.organizationId === orgId)
  }
  if (department && department !== "all") {
    responses = responses.filter((r) => r.department === department)
  }

  return responses
}

// ── Fetch all templates for question text lookup ──────────────────────
interface TemplateQuestion {
  id: string
  text: string
  type: string
}
interface TemplateDoc {
  id: string
  questions: TemplateQuestion[]
}

async function fetchTemplates(): Promise<TemplateDoc[]> {
  const docs = await getDocuments(COLLECTIONS.TEMPLATES)
  return docs as unknown as TemplateDoc[]
}

// ── Admin stat cards ──────────────────────────────────────────────────
export interface AdminStats {
  avgScore: number
  avgScoreChange: number
  completionRate: number
  completionRateChange: number
  activeUsers: number
  activeUsersChange: number
  scorecardsSent: number
  scorecardsSentChange: number
  totalOrgs: number
  totalUsers: number
}

export async function computeAdminStats(
  responses: RawResponse[],
): Promise<AdminStats> {
  const orgs = await getOrganizations()
  const users = await getDocuments(COLLECTIONS.USERS)

  // All scale answers
  const scaleAnswers = responses.flatMap((r) =>
    Object.values(r.answers).filter((v) => typeof v === "number" && v >= 1 && v <= 10),
  ) as number[]

  const avgScore =
    scaleAnswers.length > 0
      ? Math.round((scaleAnswers.reduce((a, b) => a + b, 0) / scaleAnswers.length) * 10) / 10
      : 0

  // Unique users who responded
  const uniqueUsers = new Set(responses.map((r) => r.userId))

  return {
    avgScore,
    avgScoreChange: 0.3,
    completionRate: users.length > 0 ? Math.round((uniqueUsers.size / users.length) * 100) : 0,
    completionRateChange: 2,
    activeUsers: uniqueUsers.size,
    activeUsersChange: 0,
    scorecardsSent: responses.length,
    scorecardsSentChange: 0,
    totalOrgs: orgs.length,
    totalUsers: users.length,
  }
}

// ── Weekly trend (aggregate avg score by weekOf) ──────────────────────
export function computeWeeklyTrend(responses: RawResponse[]): WeeklyTrend[] {
  const weekMap = new Map<string, { total: number; count: number; date: string }>()

  for (const r of responses) {
    const week = r.weekOf || "Unknown"
    const date = r.weekDate || r.completedAt
    const scaleVals = Object.values(r.answers).filter(
      (v) => typeof v === "number" && v >= 1 && v <= 10,
    ) as number[]
    if (scaleVals.length === 0) continue
    const avg = scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length

    if (!weekMap.has(week)) {
      weekMap.set(week, { total: 0, count: 0, date })
    }
    const entry = weekMap.get(week)!
    entry.total += avg
    entry.count += 1
  }

  return Array.from(weekMap.entries())
    .map(([week, { total, count, date }]) => ({
      week,
      score: Math.round((total / count) * 10) / 10,
      _date: date,
    }))
    .sort((a, b) => a._date.localeCompare(b._date))
    .map(({ week, score }) => ({ week, score }))
}

// ── Department performance ────────────────────────────────────────────
export function computeDepartmentPerformance(
  responses: RawResponse[],
): DepartmentPerformance[] {
  const deptMap = new Map<string, { total: number; count: number; users: Set<string> }>()

  for (const r of responses) {
    const dept = r.department || "Unknown"
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { total: 0, count: 0, users: new Set() })
    }
    const entry = deptMap.get(dept)!
    const scaleVals = Object.values(r.answers).filter(
      (v) => typeof v === "number" && v >= 1 && v <= 10,
    ) as number[]
    if (scaleVals.length === 0) continue
    const avg = scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length
    entry.total += avg
    entry.count += 1
    entry.users.add(r.userId)
  }

  return Array.from(deptMap.entries())
    .map(([department, { total, count, users }]) => ({
      department,
      avgScore: Math.round((total / count) * 10) / 10,
      participants: users.size,
      trend: 0,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
}

// ── Top performers ────────────────────────────────────────────────────
export async function computeTopPerformers(
  responses: RawResponse[],
  limit = 10,
): Promise<TopPerformer[]> {
  const orgs = await getOrganizations()
  const orgNameMap = new Map(orgs.map((o) => [o.id, (o as Record<string, unknown>).name as string]))

  const userMap = new Map<
    string,
    { name: string; orgId: string; dept: string; total: number; count: number; weeks: Set<string> }
  >()

  for (const r of responses) {
    if (!userMap.has(r.userId)) {
      userMap.set(r.userId, {
        name: r.userName || r.userId,
        orgId: r.organizationId,
        dept: r.department,
        total: 0,
        count: 0,
        weeks: new Set(),
      })
    }
    const entry = userMap.get(r.userId)!
    const scaleVals = Object.values(r.answers).filter(
      (v) => typeof v === "number" && v >= 1 && v <= 10,
    ) as number[]
    if (scaleVals.length === 0) continue
    const avg = scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length
    entry.total += avg
    entry.count += 1
    entry.weeks.add(r.weekOf)
  }

  return Array.from(userMap.entries())
    .map(([userId, { name, orgId, dept, total, count, weeks }]) => ({
      id: userId,
      name,
      company: orgNameMap.get(orgId) ?? orgId,
      companyId: orgId,
      department: dept,
      avgScore: Math.round((total / count) * 10) / 10,
      streak: weeks.size,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, limit)
}

// ── Most improved ─────────────────────────────────────────────────────
export interface MostImprovedEntry {
  name: string
  company: string
  companyId: string
  department: string
  improvement: number
  from: number
  to: number
}

export async function computeMostImproved(
  responses: RawResponse[],
  limit = 5,
): Promise<MostImprovedEntry[]> {
  const orgs = await getOrganizations()
  const orgNameMap = new Map(orgs.map((o) => [o.id, (o as Record<string, unknown>).name as string]))

  // Group by user, then by weekOf
  const userWeeks = new Map<
    string,
    { name: string; orgId: string; dept: string; weeks: Map<string, { total: number; count: number; date: string }> }
  >()

  for (const r of responses) {
    if (!userWeeks.has(r.userId)) {
      userWeeks.set(r.userId, {
        name: r.userName || r.userId,
        orgId: r.organizationId,
        dept: r.department,
        weeks: new Map(),
      })
    }
    const entry = userWeeks.get(r.userId)!
    const scaleVals = Object.values(r.answers).filter(
      (v) => typeof v === "number" && v >= 1 && v <= 10,
    ) as number[]
    if (scaleVals.length === 0) continue
    const avg = scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length
    const week = r.weekOf
    const date = r.weekDate || r.completedAt

    if (!entry.weeks.has(week)) {
      entry.weeks.set(week, { total: 0, count: 0, date })
    }
    const w = entry.weeks.get(week)!
    w.total += avg
    w.count += 1
  }

  const results: MostImprovedEntry[] = []

  for (const [, user] of userWeeks) {
    const sorted = Array.from(user.weeks.entries())
      .map(([week, { total, count, date }]) => ({
        week,
        avg: total / count,
        date,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    if (sorted.length < 2) continue
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const improvement = Math.round((last.avg - first.avg) * 10) / 10

    if (improvement > 0) {
      results.push({
        name: user.name,
        company: orgNameMap.get(user.orgId) ?? user.orgId,
        companyId: user.orgId,
        department: user.dept,
        improvement,
        from: Math.round(first.avg * 10) / 10,
        to: Math.round(last.avg * 10) / 10,
      })
    }
  }

  return results.sort((a, b) => b.improvement - a.improvement).slice(0, limit)
}

// ── Question results ──────────────────────────────────────────────────
export async function computeQuestionResults(
  responses: RawResponse[],
): Promise<QuestionResult[]> {
  const templates = await fetchTemplates()

  // Build question text lookup
  const questionTextMap = new Map<string, string>()
  for (const t of templates) {
    for (const q of t.questions || []) {
      questionTextMap.set(q.id, q.text)
    }
  }

  // Aggregate scale-type answers per question id
  const questionMap = new Map<string, { total: number; count: number }>()

  for (const r of responses) {
    for (const [qId, val] of Object.entries(r.answers)) {
      if (typeof val !== "number" || val < 1 || val > 10) continue
      if (!questionMap.has(qId)) {
        questionMap.set(qId, { total: 0, count: 0 })
      }
      const entry = questionMap.get(qId)!
      entry.total += val
      entry.count += 1
    }
  }

  return Array.from(questionMap.entries())
    .map(([qId, { total, count }]) => ({
      question: questionTextMap.get(qId) ?? qId,
      score: Math.round((total / count) * 10) / 10,
      change: Math.round(Math.random() * 8) / 10, // placeholder delta
    }))
    .sort((a, b) => b.score - a.score)
}

// ── Recent scorecards ─────────────────────────────────────────────────
export interface RecentScorecard {
  name: string
  date: string
  score: number
  templateName: string
}

export async function computeRecentScorecards(
  responses: RawResponse[],
  limit = 8,
): Promise<RecentScorecard[]> {
  const templates = await fetchTemplates()
  const tmplNameMap = new Map(templates.map((t) => [t.id, (t as unknown as Record<string, unknown>).name as string]))

  return responses
    .map((r) => {
      const scaleVals = Object.values(r.answers).filter(
        (v) => typeof v === "number" && v >= 1 && v <= 10,
      ) as number[]
      const avg =
        scaleVals.length > 0
          ? Math.round((scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length) * 10) / 10
          : 0

      return {
        name: r.userName || r.userId,
        date: new Date(r.completedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        score: avg,
        templateName: tmplNameMap.get(r.templateId) ?? r.templateId,
        _completedAt: r.completedAt,
      }
    })
    .sort((a, b) => b._completedAt.localeCompare(a._completedAt))
    .slice(0, limit)
    .map(({ _completedAt: _, ...rest }) => rest)
}
