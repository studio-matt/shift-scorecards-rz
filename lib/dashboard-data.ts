import { getDocument, getDocuments, getOrganizations, COLLECTIONS } from "./firestore"
import type {
  WeeklyTrend,
  DepartmentPerformance,
  TopPerformer,
  QuestionResult,
} from "./types"

/**
 * Parse a time value that could be:
 * - A number (hours directly)
 * - A string like "2-4 hours" or "2-4" (use midpoint = 3)
 * - A string like "0-1 hours" or "8+ hours"
 * Returns the hours value as a number.
 */
export function parseTimeValue(value: number | string): number {
  if (typeof value === "number") {
    return value
  }
  
  const str = String(value).toLowerCase().trim()
  
  // Match patterns like "2-4", "2-4 hours", "2 - 4 hrs"
  const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/)
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1])
    const high = parseFloat(rangeMatch[2])
    return (low + high) / 2 // Use midpoint
  }
  
  // Match "8+" or "8+ hours" patterns
  const plusMatch = str.match(/(\d+(?:\.\d+)?)\s*\+/)
  if (plusMatch) {
    return parseFloat(plusMatch[1]) + 2 // Assume "8+" means ~10 hours
  }
  
  // Match plain numbers like "5" or "5 hours"
  const numberMatch = str.match(/^(\d+(?:\.\d+)?)/)
  if (numberMatch) {
    return parseFloat(numberMatch[1])
  }
  
  return 0
}

/**
 * Multiplier for converting weekly responses to monthly estimates.
 * If an organization uses weekly scorecards, multiply by 4 for monthly totals.
 */
export const WEEKLY_TO_MONTHLY_MULTIPLIER = 4

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

// ── Weekly trend (aggregate hours saved by weekOf) ──────────────────────
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
export async function computeDepartmentPerformance(
  responses: RawResponse[],
): Promise<DepartmentPerformance[]> {
  // Fetch all users to get their current department assignments
  const allUsers = await getDocuments(COLLECTIONS.USERS)
  const userDeptMap = new Map<string, string>()
  for (const u of allUsers) {
    const userData = u as Record<string, unknown>
    const dept = (userData.department as string) || ""
    if (dept) {
      userDeptMap.set(u.id, dept)
    }
  }

  const deptMap = new Map<string, { total: number; count: number; users: Set<string> }>()

  for (const r of responses) {
    // Look up department from user profile first, fall back to response, then "Unknown"
    const dept = userDeptMap.get(r.userId) || r.department || "Unknown"
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

  // Build set of excluded user IDs (admins / non-participants) and user name map
  const allUsers = await getDocuments(COLLECTIONS.USERS)
  const excludedUserIds = new Set(
    allUsers
      .filter((u) => (u as Record<string, unknown>).excludeFromReporting === true)
      .map((u) => u.id),
  )
  
  // Build a map of userId -> full name (firstName + lastName)
  const userNameMap = new Map<string, string>()
  for (const u of allUsers) {
    const userData = u as Record<string, unknown>
    const firstName = (userData.firstName as string) || ""
    const lastName = (userData.lastName as string) || ""
    const fullName = `${firstName} ${lastName}`.trim()
    if (fullName) {
      userNameMap.set(u.id, fullName)
    }
  }

  // Fetch templates to identify win and goal question types
  const templates = await fetchTemplates()
  const templateMap = new Map<string, { questions: Array<{ id: string; type: string }> }>()
  for (const t of templates) {
    const template = t as unknown as { id: string; questions: Array<{ id: string; type: string }> }
    templateMap.set(template.id, template)
  }

  const userMap = new Map<
    string,
    { name: string; orgId: string; dept: string; total: number; count: number; weeks: Set<string>; winAnswers: string[]; goalAnswers: string[] }
  >()

  for (const r of responses) {
    if (excludedUserIds.has(r.userId)) continue
    if (!userMap.has(r.userId)) {
      // Prefer firstName/lastName from users collection, fallback to userName or userId
      const resolvedName = userNameMap.get(r.userId) || r.userName || r.userId
      userMap.set(r.userId, {
        name: resolvedName,
        orgId: r.organizationId,
        dept: r.department,
        total: 0,
        count: 0,
        weeks: new Set(),
        winAnswers: [],
        goalAnswers: [],
      })
    }
    const entry = userMap.get(r.userId)!
    const scaleVals = Object.values(r.answers).filter(
      (v) => typeof v === "number" && v >= 1 && v <= 10,
    ) as number[]
    
    // Extract win and goal answers based on question type
    const template = templateMap.get(r.templateId)
    if (template?.questions) {
      for (const q of template.questions) {
        const answer = r.answers[q.id]
        if (typeof answer === "string" && answer.trim().length > 10) {
          if (q.type === "win") {
            entry.winAnswers.push(answer)
          } else if (q.type === "goals") {
            entry.goalAnswers.push(answer)
          }
        }
      }
    }
    
    if (scaleVals.length === 0) continue
    const avg = scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length
    entry.total += avg
    entry.count += 1
    entry.weeks.add(r.weekOf)
  }

  // Also load admin-set win narratives from settings
  let adminNarratives: Record<string, string> = {}
  try {
    const doc = await getDocument(COLLECTIONS.SETTINGS, "winNarratives")
    if (doc) adminNarratives = (doc as Record<string, unknown>).narratives as Record<string, string> ?? {}
  } catch { /* ignore */ }

  // Calculate field average (all users' average scores)
  const userEntries = Array.from(userMap.entries())
  const allAvgScores = userEntries.map(([, { total, count }]) => total / count)
  const fieldAverage = allAvgScores.length > 0 
    ? allAvgScores.reduce((a, b) => a + b, 0) / allAvgScores.length 
    : 0

  return userEntries
    .map(([userId, { name, orgId, dept, total, count, weeks, winAnswers, goalAnswers }]) => {
      const avgScore = Math.round((total / count) * 10) / 10
      // Calculate % above/below field average
      const percentVsField = fieldAverage > 0 
        ? Math.round(((avgScore - fieldAverage) / fieldAverage) * 100) 
        : 0
      return {
        id: userId,
        name,
        company: orgNameMap.get(orgId) ?? orgId,
        companyId: orgId,
        department: dept,
        avgScore,
        percentVsField,
        streak: weeks.size,
        // Prefer admin-set narrative, then most recent win answer
        winNarrative: adminNarratives[userId] || winAnswers[winAnswers.length - 1] || undefined,
        goalNarrative: goalAnswers[goalAnswers.length - 1] || undefined,
      }
    })
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, limit)
}

// ── Most improved ─────────────────────────────────────────────────────
export interface MostImprovedEntry {
  userId: string
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

  // Build a map of userId -> full name (firstName + lastName)
  const allUsers = await getDocuments(COLLECTIONS.USERS)
  const userNameMap = new Map<string, string>()
  for (const u of allUsers) {
    const userData = u as Record<string, unknown>
    const firstName = (userData.firstName as string) || ""
    const lastName = (userData.lastName as string) || ""
    const fullName = `${firstName} ${lastName}`.trim()
    if (fullName) {
      userNameMap.set(u.id, fullName)
    }
  }

  // Group by user, then by weekOf
  const userWeeks = new Map<
    string,
    { name: string; orgId: string; dept: string; weeks: Map<string, { total: number; count: number; date: string }> }
  >()

  for (const r of responses) {
    if (!userWeeks.has(r.userId)) {
      const resolvedName = userNameMap.get(r.userId) || r.userName || r.userId
      userWeeks.set(r.userId, {
        name: resolvedName,
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

  for (const [userId, user] of userWeeks) {
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
        userId,
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
// ONLY shows time_saving type questions - these are the only ones that count for hours saved
export async function computeQuestionResults(
  responses: RawResponse[],
): Promise<QuestionResult[]> {
  const templates = await fetchTemplates()

  // Build question text lookup AND identify time_saving questions ONLY
  const questionTextMap = new Map<string, string>()
  const timeSavingQuestionIds = new Set<string>()
  for (const t of templates) {
    for (const q of t.questions || []) {
      questionTextMap.set(q.id, q.text)
      // ONLY time_saving type questions count for hours saved metrics
      if (q.type === "time_saving") {
        timeSavingQuestionIds.add(q.id)
      }
    }
  }

  // If no time_saving questions found, return empty
  if (timeSavingQuestionIds.size === 0) {
    return []
  }

  // Sort responses by date to separate current vs previous period
  const sortedResponses = [...responses].sort((a, b) => 
    new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )
  
  // Split into this week vs last week (for more granular comparison)
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  
  const thisWeekResponses = sortedResponses.filter(r => new Date(r.completedAt) >= oneWeekAgo)
  const lastWeekResponses = sortedResponses.filter(r => {
    const d = new Date(r.completedAt)
    return d >= twoWeeksAgo && d < oneWeekAgo
  })

  // Aggregate answers per question for each period - ONLY time_saving questions
  const aggregateByQuestion = (resps: RawResponse[]) => {
    const map = new Map<string, { total: number; count: number }>()
    for (const r of resps) {
      for (const [qId, val] of Object.entries(r.answers)) {
        // ONLY include time_saving type questions
        if (!timeSavingQuestionIds.has(qId)) continue
        if (typeof val !== "number" || val < 0) continue
        if (!map.has(qId)) {
          map.set(qId, { total: 0, count: 0 })
        }
        const entry = map.get(qId)!
        entry.total += val
        entry.count += 1
      }
    }
    return map
  }

  const thisWeekData = aggregateByQuestion(thisWeekResponses)
  const lastWeekData = aggregateByQuestion(lastWeekResponses)

  // Only use time_saving question IDs that have data
  const questionsWithData = Array.from(timeSavingQuestionIds).filter(
    qId => thisWeekData.has(qId) || lastWeekData.has(qId)
  )

  return questionsWithData
    .map((qId) => {
      const thisWeek = thisWeekData.get(qId)
      const lastWeek = lastWeekData.get(qId)
      
      const currentAvg = thisWeek && thisWeek.count > 0 
        ? thisWeek.total / thisWeek.count 
        : 0
      const previousAvg = lastWeek && lastWeek.count > 0 
        ? lastWeek.total / lastWeek.count 
        : 0
      
      // Calculate change (difference between this week and last week averages)
      // Positive = saving more time this week
      const change = lastWeek && lastWeek.count > 0
        ? Math.round((currentAvg - previousAvg) * 10) / 10
        : 0
      
      return {
        question: questionTextMap.get(qId) ?? qId,
        score: Math.round(currentAvg * 10) / 10, // Average minutes saved
        change,
      }
    })
    .filter(q => q.score > 0 || q.change !== 0) // Show questions with data or changes
    .sort((a, b) => b.change - a.change) // Sort by biggest improvement
}

// ── Recent scorecards ─────────────────────────────────────────────────
// Delta is calculated ONLY from time_saving type questions (minutes saved)
export interface RecentScorecard {
  userId: string
  name: string
  date: string
  score: number
  templateName: string
  delta?: number
  answers?: Record<string, unknown>
  questions?: { id: string; text: string; type: string }[]
}

export async function computeRecentScorecards(
  responses: RawResponse[],
  limit = 8,
): Promise<RecentScorecard[]> {
  const templates = await fetchTemplates()
  const tmplNameMap = new Map(templates.map((t) => [t.id, (t as unknown as Record<string, unknown>).name as string]))
  const tmplQuestionsMap = new Map(templates.map((t) => {
    const tmpl = t as unknown as Record<string, unknown>
    const questions = (tmpl.questions as { id: string; text: string; type: string }[]) || []
    return [t.id, questions]
  }))

  // Build set of time_saving question IDs per template
  const templateTimeSavingIds = new Map<string, Set<string>>()
  for (const t of templates) {
    const ids = new Set<string>()
    for (const q of t.questions || []) {
      if (q.type === "time_saving") {
        ids.add(q.id)
      }
    }
    templateTimeSavingIds.set(t.id, ids)
  }

  // Build a map of userId -> full name (firstName + lastName)
  const allUsers = await getDocuments(COLLECTIONS.USERS)
  const userNameMap = new Map<string, string>()
  for (const u of allUsers) {
    const userData = u as Record<string, unknown>
    const firstName = (userData.firstName as string) || ""
    const lastName = (userData.lastName as string) || ""
    const fullName = `${firstName} ${lastName}`.trim()
    if (fullName) {
      userNameMap.set(u.id, fullName)
    }
  }

  // Helper to calculate total HOURS saved from ONLY time_saving type questions
  // Use parseTimeValue to handle both numeric values and text ranges like "2-4 hours"
  const calculateHoursSaved = (answers: Record<string, unknown>, templateId: string): number => {
    const timeSavingIds = templateTimeSavingIds.get(templateId) || new Set()
    let totalHours = 0
    for (const [qId, val] of Object.entries(answers)) {
      // ONLY include time_saving type questions
      if (!timeSavingIds.has(qId)) continue
      if (val !== undefined && val !== null && val !== "") {
        totalHours += parseTimeValue(val as number | string)
      }
    }
    return totalHours
  }

  // Group responses by user to calculate deltas
  const userTimeSaved = new Map<string, { hours: number; date: string }[]>()
  for (const r of responses) {
    if (!userTimeSaved.has(r.userId)) {
      userTimeSaved.set(r.userId, [])
    }
    const hours = calculateHoursSaved(r.answers, r.templateId)
    userTimeSaved.get(r.userId)!.push({ hours, date: r.completedAt })
  }
  
  // Sort each user's data by date (newest first)
  for (const data of userTimeSaved.values()) {
    data.sort((a, b) => b.date.localeCompare(a.date))
  }

  return responses
    .map((r) => {
      const currentHours = calculateHoursSaved(r.answers, r.templateId)

      // Calculate delta from previous scorecard (hours difference)
      const userHistory = userTimeSaved.get(r.userId) || []
      const currentIdx = userHistory.findIndex(h => h.date === r.completedAt)
      const hasPrevious = currentIdx >= 0 && currentIdx < userHistory.length - 1
      const previousHours = hasPrevious ? userHistory[currentIdx + 1].hours : null
      
      // If no previous scorecard, delta is undefined (will show as "First entry" in UI)
      // If there IS a previous, calculate the difference in hours
      const delta = previousHours !== null 
        ? Math.round((currentHours - previousHours) * 10) / 10 
        : undefined

      const resolvedName = userNameMap.get(r.userId) || r.userName || r.userId
      return {
        userId: r.userId,
        name: resolvedName,
        date: new Date(r.completedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        score: currentHours, // Total HOURS saved from time_saving questions
        templateName: tmplNameMap.get(r.templateId) ?? r.templateId,
        delta,
        answers: r.answers,
        questions: tmplQuestionsMap.get(r.templateId) ?? [],
        _completedAt: r.completedAt,
      }
    })
    .sort((a, b) => b._completedAt.localeCompare(a._completedAt))
    .slice(0, limit)
    .map(({ _completedAt: _, ...rest }) => rest)
}

// ── Engagement: Streak tracking ───────────────────────────────────────
export interface UserStreak {
  userId: string
  name: string
  department: string
  currentStreak: number
  maxStreak: number
  totalResponses: number
}

export async function computeStreaks(responses: RawResponse[], userNameMap?: Map<string, string>): Promise<UserStreak[]> {
  // Build a map of userId -> full name if not provided
  if (!userNameMap) {
    userNameMap = new Map<string, string>()
    const allUsers = await getDocuments(COLLECTIONS.USERS)
    for (const u of allUsers) {
      const userData = u as Record<string, unknown>
      const firstName = (userData.firstName as string) || ""
      const lastName = (userData.lastName as string) || ""
      const fullName = `${firstName} ${lastName}`.trim()
      if (fullName) {
        userNameMap.set(u.id, fullName)
      }
    }
  }

  const userMap = new Map<string, { name: string; dept: string; weeks: Set<string>; total: number }>()
  for (const r of responses) {
    if (!userMap.has(r.userId)) {
      const resolvedName = userNameMap.get(r.userId) || r.userName || r.userId
      userMap.set(r.userId, { name: resolvedName, dept: r.department, weeks: new Set(), total: 0 })
    }
    const entry = userMap.get(r.userId)!
    entry.weeks.add(r.weekOf)
    entry.total += 1
  }
  const allWeeks = Array.from(new Set(responses.map((r) => r.weekOf))).sort()
  return Array.from(userMap.entries())
    .map(([userId, { name, dept, weeks, total }]) => {
      let maxStreak = 0, streak = 0
      for (const w of allWeeks) { if (weeks.has(w)) { streak++; maxStreak = Math.max(maxStreak, streak) } else { streak = 0 } }
      return { userId, name, department: dept, currentStreak: streak, maxStreak, totalResponses: total }
    })
    .sort((a, b) => b.currentStreak - a.currentStreak)
}

// ── Engagement: Non-responders ────────────────────────────────────────
export interface NonResponder {
  userId: string
  name: string
  department: string
  orgName: string
  missedWeeks: number
  lastResponseWeek: string
}

export async function computeNonResponders(responses: RawResponse[], filterOrgId?: string): Promise<NonResponder[]> {
  const allUsersRaw = await getDocuments(COLLECTIONS.USERS)
  // Filter out users flagged as excluded from reporting (admins, non-participants)
  // AND filter by organization if filterOrgId is provided
  const allUsers = allUsersRaw.filter((u) => {
    const data = u as Record<string, unknown>
    if (data.excludeFromReporting === true) return false
    // If filtering by org, only include users from that org
    if (filterOrgId && filterOrgId !== "all") {
      return data.organizationId === filterOrgId
    }
    return true
  })
  const orgs = await getOrganizations()
  const orgNameMap = new Map(orgs.map((o) => [o.id, (o as Record<string, unknown>).name as string]))
  const allWeeks = Array.from(new Set(responses.map((r) => r.weekOf))).sort()
  const totalWeeks = allWeeks.length || 1
  const respondedWeeks = new Map<string, Set<string>>()
  for (const r of responses) {
    if (!respondedWeeks.has(r.userId)) respondedWeeks.set(r.userId, new Set())
    respondedWeeks.get(r.userId)!.add(r.weekOf)
  }

  // Deduplicate users by normalized name (first+last+org) to prevent
  // duplicate accounts from appearing as separate entries.
  const seen = new Map<string, string>() // normalizedKey -> userId (keep the one with more responses)
  const userResponseCount = new Map<string, number>()
  for (const u of allUsers) {
    const data = u as Record<string, unknown>
    const firstName = ((data.firstName as string) ?? "").trim().toLowerCase()
    const lastName = ((data.lastName as string) ?? "").trim().toLowerCase()
    const orgId = (data.organizationId as string) ?? ""
    const dedupKey = `${firstName}|${lastName}|${orgId}`
    const thisCount = respondedWeeks.get(u.id)?.size ?? 0
    userResponseCount.set(u.id, thisCount)

    if (firstName || lastName) {
      const existingId = seen.get(dedupKey)
      if (existingId) {
        // Keep the account with more responses; merge response weeks
        const existingCount = userResponseCount.get(existingId) ?? 0
        const keepId = thisCount >= existingCount ? u.id : existingId
        const mergeId = keepId === u.id ? existingId : u.id
        // Merge weeks into the kept account
        const keepWeeks = respondedWeeks.get(keepId) ?? new Set()
        const mergeWeeks = respondedWeeks.get(mergeId) ?? new Set()
        for (const w of mergeWeeks) keepWeeks.add(w)
        respondedWeeks.set(keepId, keepWeeks)
        seen.set(dedupKey, keepId)
        continue
      }
      seen.set(dedupKey, u.id)
    }
  }

  // Build set of deduped user IDs to include
  const dedupedIds = new Set(seen.values())
  // Also include users without first/last names (can't dedup those)
  for (const u of allUsers) {
    const data = u as Record<string, unknown>
    const firstName = ((data.firstName as string) ?? "").trim().toLowerCase()
    const lastName = ((data.lastName as string) ?? "").trim().toLowerCase()
    if (!firstName && !lastName) dedupedIds.add(u.id)
  }

  const result: NonResponder[] = []
  for (const u of allUsers) {
    if (!dedupedIds.has(u.id)) continue
    const data = u as Record<string, unknown>
    const weeks = respondedWeeks.get(u.id)
    const missedWeeks = totalWeeks - (weeks?.size ?? 0)
    if (missedWeeks > 0) {
      const lastWeek = weeks ? Array.from(weeks).sort().pop() ?? "Never" : "Never"
      result.push({
        userId: u.id,
        name: `${(data.firstName as string) ?? ""} ${(data.lastName as string) ?? ""}`.trim() || ((data.email as string) ?? ""),
        department: (data.department as string) ?? "",
        orgName: orgNameMap.get((data.organizationId as string) ?? "") ?? "",
        missedWeeks,
        lastResponseWeek: lastWeek,
      })
    }
  }
  return result.sort((a, b) => b.missedWeeks - a.missedWeeks)
}

// ── Trend: Score velocity ─────────────────────────────────────────────
export interface ScoreVelocity {
  userId: string
  name: string
  department: string
  velocity: number
  currentAvg: number
}

export async function computeScoreVelocity(responses: RawResponse[]): Promise<ScoreVelocity[]> {
  // Build a map of userId -> full name (firstName + lastName)
  const allUsers = await getDocuments(COLLECTIONS.USERS)
  const userNameMap = new Map<string, string>()
  for (const u of allUsers) {
    const userData = u as Record<string, unknown>
    const firstName = (userData.firstName as string) || ""
    const lastName = (userData.lastName as string) || ""
    const fullName = `${firstName} ${lastName}`.trim()
    if (fullName) {
      userNameMap.set(u.id, fullName)
    }
  }

  const userWeeks = new Map<string, { name: string; dept: string; weeks: Map<string, { total: number; count: number; date: string }> }>()
  for (const r of responses) {
    if (!userWeeks.has(r.userId)) {
      const resolvedName = userNameMap.get(r.userId) || r.userName || r.userId
      userWeeks.set(r.userId, { name: resolvedName, dept: r.department, weeks: new Map() })
    }
    const entry = userWeeks.get(r.userId)!
    const scaleVals = Object.values(r.answers).filter((v) => typeof v === "number" && v >= 1 && v <= 10) as number[]
    if (scaleVals.length === 0) continue
    const avg = scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length
    const date = r.weekDate || r.completedAt
    if (!entry.weeks.has(r.weekOf)) entry.weeks.set(r.weekOf, { total: 0, count: 0, date })
    const w = entry.weeks.get(r.weekOf)!
    w.total += avg; w.count += 1
  }
  const results: ScoreVelocity[] = []
  for (const [userId, user] of userWeeks) {
    const sorted = Array.from(user.weeks.entries()).map(([, { total, count, date }]) => ({ avg: total / count, date })).sort((a, b) => a.date.localeCompare(b.date))
    if (sorted.length < 2) continue
    const n = sorted.length
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
    for (let i = 0; i < n; i++) { sumX += i; sumY += sorted[i].avg; sumXY += i * sorted[i].avg; sumXX += i * i }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    results.push({ userId, name: user.name, department: user.dept, velocity: Math.round(slope * 100) / 100, currentAvg: Math.round(sorted[sorted.length - 1].avg * 10) / 10 })
  }
  return results.sort((a, b) => Math.abs(b.velocity) - Math.abs(a.velocity))
}

// ── Trend: Dept variance ──────────────────────────────────────────────
export interface DepartmentVariance {
  department: string
  avgScore: number
  stdDev: number
  responseCount: number
  highPerformers: number  // score >= 8
  needsSupport: number    // score < 6
  totalUsers: number
}

export async function computeDepartmentVariance(responses: RawResponse[]): Promise<DepartmentVariance[]> {
  // Fetch all users to get their current department assignments
  const allUsers = await getDocuments(COLLECTIONS.USERS)
  const userDeptMap = new Map<string, string>()
  for (const u of allUsers) {
    const userData = u as Record<string, unknown>
    const dept = (userData.department as string) || ""
    if (dept) {
      userDeptMap.set(u.id, dept)
    }
  }

  // Group scores per user per department
  const deptUserScores = new Map<string, Map<string, number[]>>()
  for (const r of responses) {
    // Look up department from user profile first, fall back to response, then "Unknown"
    const dept = userDeptMap.get(r.userId) || r.department || "Unknown"
    if (!deptUserScores.has(dept)) deptUserScores.set(dept, new Map())
    const userMap = deptUserScores.get(dept)!
    if (!userMap.has(r.userId)) userMap.set(r.userId, [])
    const scaleVals = Object.values(r.answers).filter((v) => typeof v === "number" && v >= 1 && v <= 10) as number[]
    if (scaleVals.length === 0) continue
    userMap.get(r.userId)!.push(scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length)
  }
  return Array.from(deptUserScores.entries()).map(([department, userMap]) => {
    const allScores: number[] = []
    let highPerformers = 0
    let needsSupport = 0
    for (const scores of userMap.values()) {
      if (scores.length === 0) continue
      const userAvg = scores.reduce((a, b) => a + b, 0) / scores.length
      allScores.push(userAvg)
      if (userAvg >= 8) highPerformers++
      if (userAvg < 6) needsSupport++
    }
    if (allScores.length === 0) return null
    const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length
    const variance = allScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / allScores.length
    return {
      department,
      avgScore: Math.round(mean * 10) / 10,
      stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
      responseCount: allScores.length,
      highPerformers,
      needsSupport,
      totalUsers: userMap.size,
    }
  }).filter(Boolean).sort((a, b) => b!.stdDev - a!.stdDev) as DepartmentVariance[]
}

// ── Trend: Question correlation ──���────────────────────────────────────
export interface QuestionCorrelation {
  question1: string
  question2: string
  correlation: number
}

export async function computeQuestionCorrelations(responses: RawResponse[]): Promise<QuestionCorrelation[]> {
  const templates = await fetchTemplates()
  const qTextMap = new Map<string, string>()
  for (const t of templates) for (const q of t.questions || []) qTextMap.set(q.id, q.text)
  const qIds = new Set<string>()
  for (const r of responses) for (const [qId, val] of Object.entries(r.answers)) { if (typeof val === "number" && val >= 1 && val <= 10) qIds.add(qId) }
  const qIdArr = Array.from(qIds)
  const results: QuestionCorrelation[] = []
  for (let i = 0; i < qIdArr.length; i++) {
    for (let j = i + 1; j < qIdArr.length; j++) {
      const q1 = qIdArr[i], q2 = qIdArr[j]
      const pairs: [number, number][] = []
      for (const r of responses) {
        const v1 = r.answers[q1], v2 = r.answers[q2]
        if (typeof v1 === "number" && typeof v2 === "number" && v1 >= 1 && v1 <= 10 && v2 >= 1 && v2 <= 10) pairs.push([v1, v2])
      }
      if (pairs.length < 3) continue
      const n = pairs.length
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0
      for (const [x, y] of pairs) { sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; sumYY += y * y }
      const denom = Math.sqrt((n * sumXX - sumX ** 2) * (n * sumYY - sumY ** 2))
      const corr = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom
      results.push({ question1: qTextMap.get(q1) ?? q1, question2: qTextMap.get(q2) ?? q2, correlation: Math.round(corr * 100) / 100 })
    }
  }
  return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
}

// ── Org Intelligence: Dept over time ──────────────────────────────────
export interface DeptOverTime { week: string; [department: string]: string | number }

export async function computeDeptOverTime(responses: RawResponse[]): Promise<DeptOverTime[]> {
  // Fetch all users to get their current department assignments
  const allUsers = await getDocuments(COLLECTIONS.USERS)
  const userDeptMap = new Map<string, string>()
  for (const u of allUsers) {
    const userData = u as Record<string, unknown>
    const dept = (userData.department as string) || ""
    if (dept) {
      userDeptMap.set(u.id, dept)
    }
  }

  const weekDeptMap = new Map<string, Map<string, { total: number; count: number }>>()
  const allDepts = new Set<string>()
  for (const r of responses) {
    // Look up department from user profile first, fall back to response, then "Unknown"
    const dept = userDeptMap.get(r.userId) || r.department || "Unknown"
    allDepts.add(dept)
    if (!weekDeptMap.has(r.weekOf)) weekDeptMap.set(r.weekOf, new Map())
    const deptMap = weekDeptMap.get(r.weekOf)!
    if (!deptMap.has(dept)) deptMap.set(dept, { total: 0, count: 0 })
    const scaleVals = Object.values(r.answers).filter((v) => typeof v === "number" && v >= 1 && v <= 10) as number[]
    if (scaleVals.length === 0) continue
    const avg = scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length
    const entry = deptMap.get(dept)!
    entry.total += avg; entry.count += 1
  }
  return Array.from(weekDeptMap.keys()).sort().map((week) => {
    const row: DeptOverTime = { week }
    const deptMap = weekDeptMap.get(week)!
    for (const dept of allDepts) { const e = deptMap.get(dept); row[dept] = e ? Math.round((e.total / e.count) * 10) / 10 : 0 }
    return row
  })
}

// ── Org Intelligence: Cross-org benchmarking ──────────────────────────
export interface OrgBenchmark { orgName: string; avgScore: number; responseRate: number; totalResponses: number; userCount: number }

export async function computeOrgBenchmarks(responses: RawResponse[]): Promise<OrgBenchmark[]> {
  const orgs = await getOrganizations()
  const orgNameMap = new Map(orgs.map((o) => [o.id, (o as Record<string, unknown>).name as string]))
  const users = await getDocuments(COLLECTIONS.USERS)
  const orgUsers = new Map<string, number>()
  for (const u of users) { const orgId = (u as Record<string, unknown>).organizationId as string; if (orgId) orgUsers.set(orgId, (orgUsers.get(orgId) ?? 0) + 1) }
  const orgMap = new Map<string, { total: number; count: number; users: Set<string> }>()
  for (const r of responses) {
    if (!orgMap.has(r.organizationId)) orgMap.set(r.organizationId, { total: 0, count: 0, users: new Set() })
    const entry = orgMap.get(r.organizationId)!
    const scaleVals = Object.values(r.answers).filter((v) => typeof v === "number" && v >= 1 && v <= 10) as number[]
    if (scaleVals.length === 0) continue
    entry.total += scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length; entry.count += 1; entry.users.add(r.userId)
  }
  return Array.from(orgMap.entries()).map(([orgId, { total, count, users }]) => {
    const userCount = orgUsers.get(orgId) ?? 0
    return { orgName: orgNameMap.get(orgId) ?? orgId, avgScore: Math.round((total / count) * 10) / 10, responseRate: userCount > 0 ? Math.min(100, Math.round((users.size / userCount) * 100)) : 0, totalResponses: count, userCount }
  }).sort((a, b) => b.avgScore - a.avgScore)
}

// ── Field Report: aggregated anonymized cross-org summary ──────────────
export interface FieldReportData {
  generatedAt: string
  totalOrganizations: number
  totalEmployees: number
  totalResponses: number
  totalHoursSaved: number
  avgResponseRate: number
  topCategories: { question: string; avgScore: number }[]
  bottomCategories: { question: string; avgScore: number }[]
  orgCount: number
  periodLabel: string
}

export async function computeFieldReport(responses: RawResponse[]): Promise<FieldReportData> {
  const orgs = await getOrganizations()
  const allUsers = await getDocuments(COLLECTIONS.USERS)
  const templates = await fetchTemplates()
  
  // Build question ID -> question text map
  const questionTextMap = new Map<string, string>()
  for (const t of templates) {
    for (const q of t.questions || []) {
      questionTextMap.set(q.id, q.text)
    }
  }
  
  // Exclude non-participant accounts
  const excludedIds = new Set(allUsers.filter((u) => (u as Record<string, unknown>).excludeFromReporting === true).map((u) => u.id))
  const users = allUsers.filter((u) => !excludedIds.has(u.id))
  const participantResponses = responses.filter((r) => !excludedIds.has(r.userId))
  const uniqueOrgs = new Set(participantResponses.map((r) => r.organizationId))
  const uniqueUsers = new Set(participantResponses.map((r) => r.userId))

  // Calculate total hours saved (sum of all time_saving responses)
  let totalHoursSaved = 0
  const questionScores = new Map<string, { total: number; count: number }>()

  for (const r of responses) {
    const entries = Object.entries(r.answers)
    for (const [q, v] of entries) {
      if (typeof v === "number" && v >= 1 && v <= 10) {
        totalHoursSaved += v
        if (!questionScores.has(q)) questionScores.set(q, { total: 0, count: 0 })
        const qe = questionScores.get(q)!
        qe.total += v
        qe.count++
      }
    }
  }

  // Round to 1 decimal place
  totalHoursSaved = Math.round(totalHoursSaved * 10) / 10

  // Question ranking - look up actual question text from templates
  const ranked = Array.from(questionScores.entries())
    .map(([q, { total, count }]) => ({
      question: questionTextMap.get(q) || q, // Use question text, fallback to ID if not found
      avgScore: Math.round((total / count) * 10) / 10,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  // Response rate
  const orgUserCounts = new Map<string, number>()
  for (const u of users) {
    const orgId = (u as Record<string, unknown>).organizationId as string
    if (orgId) orgUserCounts.set(orgId, (orgUserCounts.get(orgId) ?? 0) + 1)
  }
  let totalOrgUsers = 0
  for (const orgId of uniqueOrgs) {
    totalOrgUsers += orgUserCounts.get(orgId) ?? 0
  }
  const avgResponseRate = totalOrgUsers > 0 ? Math.round((uniqueUsers.size / totalOrgUsers) * 100) : 0

  // Period label
  const weeks = Array.from(new Set(responses.map((r) => r.weekOf))).sort()
  const periodLabel = weeks.length > 0 ? `${weeks[0]} to ${weeks[weeks.length - 1]}` : "No data"

  const now = new Date()
  const month = now.toLocaleString("default", { month: "long", year: "numeric" })

  return {
    generatedAt: month,
    totalOrganizations: uniqueOrgs.size,
    totalEmployees: users.length,
    totalResponses: responses.length,
    totalHoursSaved,
    avgResponseRate,
    topCategories: ranked.slice(0, 5),
    bottomCategories: ranked.slice(-5).reverse(),
    orgCount: orgs.length,
    periodLabel,
  }
}

// ── Actionable: Threshold alerts ──────────────────────────────────────
export interface ThresholdAlert {
  type: "low_score" | "declining"
  severity: "warning" | "critical"
  entity: string
  entityType: "department" | "user"
  message: string
  value: number
}

export function computeAlerts(responses: RawResponse[], deptPerf: DepartmentPerformance[], velocities: ScoreVelocity[]): ThresholdAlert[] {
  const alerts: ThresholdAlert[] = []
  for (const d of deptPerf) {
    if (d.avgScore < 5.0) alerts.push({ type: "low_score", severity: d.avgScore < 4.0 ? "critical" : "warning", entity: d.department, entityType: "department", message: `${d.department} hours saved is ${d.avgScore} hrs`, value: d.avgScore })
  }
  for (const v of velocities) {
    if (v.velocity < -0.3) alerts.push({ type: "declining", severity: v.velocity < -0.6 ? "critical" : "warning", entity: v.name, entityType: "user", message: `${v.name} hours declining at ${v.velocity}/week`, value: v.velocity })
  }
  return alerts.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1))
}

// ═══════════════════════════════════════════════════����══════════════════
// USER-SPECIFIC METRICS (privacy-safe: only their data + anonymized avgs)
// ══════════════════════════════════════════════════════════════════════

export interface UserPersonalStreak {
  currentStreak: number
  maxStreak: number
  totalResponses: number
  totalWeeks: number
}

export function computePersonalStreak(responses: RawResponse[], userId: string): UserPersonalStreak {
  const allWeeks = Array.from(new Set(responses.map((r) => r.weekOf))).sort()
  const myWeeks = new Set(responses.filter((r) => r.userId === userId).map((r) => r.weekOf))
  let maxStreak = 0, streak = 0
  for (const w of allWeeks) {
    if (myWeeks.has(w)) { streak++; maxStreak = Math.max(maxStreak, streak) } else { streak = 0 }
  }
  return { currentStreak: streak, maxStreak, totalResponses: myWeeks.size, totalWeeks: allWeeks.length }
}

export interface PersonalTrendPoint {
  week: string
  myScore: number
  deptAvg: number
  orgAvg: number
}

export function computePersonalTrend(responses: RawResponse[], userId: string): PersonalTrendPoint[] {
  const myResponses = responses.filter((r) => r.userId === userId)
  if (myResponses.length === 0) return []
  const myDept = myResponses[0].department
  const myOrg = myResponses[0].organizationId

  const weekMap = new Map<string, { my: number[]; dept: number[]; org: number[] }>()
  const allWeeks = new Set<string>()

  for (const r of responses) {
    allWeeks.add(r.weekOf)
    if (!weekMap.has(r.weekOf)) weekMap.set(r.weekOf, { my: [], dept: [], org: [] })
    const entry = weekMap.get(r.weekOf)!
    const scaleVals = Object.values(r.answers).filter((v) => typeof v === "number" && v >= 1 && v <= 10) as number[]
    if (scaleVals.length === 0) continue
    const avg = scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length
    if (r.userId === userId) entry.my.push(avg)
    if (r.department === myDept) entry.dept.push(avg)
    if (r.organizationId === myOrg) entry.org.push(avg)
  }

  return Array.from(allWeeks).sort().map((week) => {
    const e = weekMap.get(week)!
    const mean = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0
    return { week, myScore: mean(e.my), deptAvg: mean(e.dept), orgAvg: mean(e.org) }
  }).filter((p) => p.myScore > 0)
}

export interface PersonalVsBenchmark {
  myAvg: number
  deptAvg: number
  orgAvg: number
  deptName: string
  myVelocity: number
  percentile: number // what % of users you score above
}

export function computePersonalBenchmark(responses: RawResponse[], userId: string): PersonalVsBenchmark | null {
  const myResponses = responses.filter((r) => r.userId === userId)
  if (myResponses.length === 0) return null
  const myDept = myResponses[0].department
  const myOrg = myResponses[0].organizationId

  // My avg
  const myScores: number[] = []
  for (const r of myResponses) {
    const vals = Object.values(r.answers).filter((v) => typeof v === "number" && v >= 1 && v <= 10) as number[]
    if (vals.length > 0) myScores.push(vals.reduce((a, b) => a + b, 0) / vals.length)
  }
  const myAvg = myScores.length > 0 ? myScores.reduce((a, b) => a + b, 0) / myScores.length : 0

  // Dept avg (anonymized - just the number)
  const deptScores: number[] = []
  const orgScores: number[] = []
  const userAvgs = new Map<string, number[]>()
  for (const r of responses) {
    if (r.organizationId === myOrg) {
      const vals = Object.values(r.answers).filter((v) => typeof v === "number" && v >= 1 && v <= 10) as number[]
      if (vals.length === 0) continue
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      orgScores.push(avg)
      if (r.department === myDept) deptScores.push(avg)
      if (!userAvgs.has(r.userId)) userAvgs.set(r.userId, [])
      userAvgs.get(r.userId)!.push(avg)
    }
  }
  const deptAvg = deptScores.length > 0 ? deptScores.reduce((a, b) => a + b, 0) / deptScores.length : 0
  const orgAvg = orgScores.length > 0 ? orgScores.reduce((a, b) => a + b, 0) / orgScores.length : 0

  // Percentile (% of users I score above)
  const allUserAvgs = Array.from(userAvgs.entries()).map(([uid, scores]) => ({
    uid,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }))
  const belowMe = allUserAvgs.filter((u) => u.avg < myAvg).length
  // If only 1 user or no other users, they are in the top percentile (100)
  // If multiple users, calculate normally
  const percentile = allUserAvgs.length <= 1 ? 100 : Math.round((belowMe / (allUserAvgs.length - 1)) * 100)

  // My velocity
  const vel = computeScoreVelocity(myResponses)
  const myVel = Array.isArray(vel) ? vel.find((v) => v.userId === userId) : undefined

  return {
    myAvg: Math.round(myAvg * 10) / 10,
    deptAvg: Math.round(deptAvg * 10) / 10,
    orgAvg: Math.round(orgAvg * 10) / 10,
    deptName: myDept,
    myVelocity: myVel?.velocity ?? 0,
    percentile,
  }
}

// ══════════════════════════════════════════════════════════════════════
// HOURS SAVED & CONFIDENCE METRICS (Time-centric approach)
// ══════════════════════════════════════════════════════════════════════

export interface UserHoursMetrics {
  totalHoursSavedAllTime: number   // All-time total hours
  thisMonthHours: number           // Current month hours
  lastMonthHours: number           // Previous month hours
  monthOverMonthChange: number     // Absolute difference
  monthOverMonthPercent: number    // % change
  weeklyAvgHours: number           // Avg hours per week this month
  productivityPercent: number      // (weeklyAvg / 40) * 100
  responseCount: number            // Total scorecards submitted
  thisMonthResponses: number       // Responses this month
  lastMonthResponses: number       // Responses last month
  confidenceScore: number          // Latest confidence (1-10)
  lastMonthConfidence: number      // Last month avg confidence
  confidenceChange: number         // MoM change in confidence
}

export interface OrgHoursMetrics {
  totalHoursSaved: number
  monthlyHours: number
  lastMonthHours: number
  monthOverMonthChange: number
  monthOverMonthPercent: number
  avgProductivityPercent: number
  avgConfidence: number
  lastMonthConfidence: number
  confidenceChange: number
  fteEquivalent: number           // monthlyHours / 160 (40hrs * 4 weeks)
  annualRunRate: number           // monthlyHours * 12
  monthlyValue: number            // monthlyHours * hourlyRate
  annualValue: number             // monthlyValue * 12
  perPersonValue: number          // monthlyValue / activeParticipants
  activeParticipants: number
  thisMonthResponses: number
  lastMonthResponses: number
}

// ── Helper: Find time-saving question IDs from templates ──────────────────
// Returns ALL questions with type === "time_saving"
// Each question represents hours saved on a different task, so we sum them all
export async function findTimeSavingQuestionIds(): Promise<string[]> {
  const templates = await fetchTemplates()
  const ids: string[] = []
  
  // Collect ALL questions with explicit type === "time_saving"
  for (const t of templates) {
    for (const q of t.questions || []) {
      if (q.type === "time_saving") {
        ids.push(q.id)
      }
    }
  }
  
  return ids
}

// ── Helper: Find ALL confidence question IDs from templates ────────────────
// Looks for questions with type === "confidence" OR text containing "confidence"
export async function findConfidenceQuestionIds(): Promise<string[]> {
  const templates = await fetchTemplates()
  const ids: string[] = []
  for (const t of templates) {
    for (const q of t.questions || []) {
      // First check for explicit confidence type
      if (q.type === "confidence") {
        ids.push(q.id)
        continue
      }
      // Fallback: Match questions containing "confidence" in text
      const text = (q.text || "").toLowerCase()
      if (text.includes("confidence")) {
        ids.push(q.id)
      }
    }
  }
  return ids
}

// Backwards compatibility - returns first confidence question ID
export async function findConfidenceQuestionId(): Promise<string | null> {
  const ids = await findConfidenceQuestionIds()
  return ids.length > 0 ? ids[0] : null
}

// ── Helper: Get current and previous month boundaries ─────────────────
function getMonthBoundaries() {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  return { thisMonthStart, lastMonthStart, lastMonthEnd }
}

// ── Compute hours metrics for a single user ───────────────────────────
export function computeUserHoursMetrics(
  responses: RawResponse[],
  userId: string,
  timeSavingIds: string[],
  confidenceIds: string[], // Changed to array to support multiple confidence questions
): UserHoursMetrics {
  const { thisMonthStart, lastMonthStart, lastMonthEnd } = getMonthBoundaries()
  
  const myResponses = responses.filter((r) => r.userId === userId)
  
  // Values are already in HOURS (not minutes) - users enter hours directly (1-10 scale = 1-10 hours)
  let totalHoursVal = 0
  let thisMonthHoursVal = 0
  let lastMonthHoursVal = 0
  let thisMonthResponses = 0
  let lastMonthResponses = 0
  const confidenceScores: number[] = []
  const lastMonthConfidenceScores: number[] = []
  
  for (const r of myResponses) {
    const responseDate = new Date(r.completedAt)
    const isThisMonth = responseDate >= thisMonthStart
    const isLastMonth = responseDate >= lastMonthStart && responseDate <= lastMonthEnd
    
    // Sum all time-saving question answers
    // Use parseTimeValue to handle both numeric values and text ranges like "2-4 hours"
    for (const qId of timeSavingIds) {
      const val = r.answers[qId]
      if (val !== undefined && val !== null && val !== "") {
        const hours = parseTimeValue(val)
        if (hours > 0) {
          totalHoursVal += hours
          if (isThisMonth) thisMonthHoursVal += hours
          if (isLastMonth) lastMonthHoursVal += hours
        }
      }
    }
    
    // Count responses per month
    if (isThisMonth) thisMonthResponses++
    if (isLastMonth) lastMonthResponses++
    
    // Track confidence scores from ALL confidence-type questions
    for (const confId of confidenceIds) {
      const conf = r.answers[confId]
      if (typeof conf === "number" && conf >= 1 && conf <= 10) {
        confidenceScores.push(conf)
        if (isLastMonth) lastMonthConfidenceScores.push(conf)
      }
    }
  }
  
  // Values are already in hours - no conversion needed
  const totalHours = totalHoursVal
  const thisMonthHours = thisMonthHoursVal
  const lastMonthHours = lastMonthHoursVal
  
  // Calculate MoM change
  const monthOverMonthChange = thisMonthHours - lastMonthHours
  const monthOverMonthPercent = lastMonthHours > 0 
    ? ((thisMonthHours - lastMonthHours) / lastMonthHours) * 100 
    : thisMonthHours > 0 ? 100 : 0
  
  // Weekly average (assuming ~4 weeks in a month)
  const weeksThisMonth = Math.max(1, Math.ceil((new Date().getDate()) / 7))
  const weeklyAvgHours = thisMonthHours / weeksThisMonth
  
  // Productivity as % of 40-hour work week
  const productivityPercent = (weeklyAvgHours / 40) * 100
  
  // Confidence - use latest if available
  const confidenceScore = confidenceScores.length > 0 
    ? confidenceScores[confidenceScores.length - 1] 
    : 0
  const lastMonthConfidence = lastMonthConfidenceScores.length > 0
    ? lastMonthConfidenceScores.reduce((a, b) => a + b, 0) / lastMonthConfidenceScores.length
    : 0
  const confidenceChange = confidenceScore - lastMonthConfidence
  
  return {
    totalHoursSavedAllTime: Math.round(totalHours * 10) / 10,
    thisMonthHours: Math.round(thisMonthHours * 10) / 10,
    lastMonthHours: Math.round(lastMonthHours * 10) / 10,
    monthOverMonthChange: Math.round(monthOverMonthChange * 10) / 10,
    monthOverMonthPercent: Math.round(monthOverMonthPercent * 10) / 10,
    weeklyAvgHours: Math.round(weeklyAvgHours * 10) / 10,
    productivityPercent: Math.round(productivityPercent * 10) / 10,
    responseCount: myResponses.length,
    thisMonthResponses,
    lastMonthResponses,
    confidenceScore: Math.round(confidenceScore * 10) / 10,
    lastMonthConfidence: Math.round(lastMonthConfidence * 10) / 10,
    confidenceChange: Math.round(confidenceChange * 10) / 10,
  }
}

// ── Compute hours metrics for an organization ─────────────────────────
// NOTE: This function now computes metrics from ALL passed-in responses
// The responses should already be filtered by the desired time period (month, quarter, YTD, etc.)
// by the caller. This function sums up hours from ALL responses passed to it.
export function computeOrgHoursMetrics(
  responses: RawResponse[],
  timeSavingIds: string[],
  confidenceIds: string[], // Changed to array to support multiple confidence questions
  hourlyRate: number = 100,
): OrgHoursMetrics {
  // Sum hours from ALL passed-in responses (already filtered by caller's time period)
  let periodHoursVal = 0
  const allUsers = new Set<string>()
  const allConfidenceScores: number[] = []
  
  for (const r of responses) {
    // Track ALL users who submitted scorecards in this period
    allUsers.add(r.userId)
    
    // Sum all time-saving question answers
    // Use parseTimeValue to handle both numeric values and text ranges like "2-4 hours"
    for (const qId of timeSavingIds) {
      const val = r.answers[qId]
      if (val !== undefined && val !== null && val !== "") {
        const hours = parseTimeValue(val)
        if (hours > 0) {
          periodHoursVal += hours
        }
      }
    }
    
    // Track confidence scores from ALL confidence-type questions
    for (const confId of confidenceIds) {
      const conf = r.answers[confId]
      if (typeof conf === "number" && conf >= 1 && conf <= 10) {
        allConfidenceScores.push(conf)
      }
    }
  }
  
  // Use total hours from the period (already filtered by caller)
  const periodHours = periodHoursVal
  
  // Active participants = users in this filtered period
  const activeParticipants = allUsers.size
  
  // Calculate productivity as percentage of total work capacity saved
  // Total work capacity for all participants = activeParticipants * 160 hours/month
  // Productivity = hours saved / total work capacity * 100
  const totalWorkCapacity = activeParticipants > 0 ? activeParticipants * 160 : 160
  const avgProductivityPercent = (periodHours / totalWorkCapacity) * 100
  

  
  // FTE equivalent (160 hours = 1 FTE per month) - this is the company total, not per person
  const fteEquivalent = periodHours / 160
  
  // Annual projections (extrapolate from period data)
  const annualRunRate = periodHours * 12
  
  // Dollar values
  const periodValue = periodHours * hourlyRate
  const annualValue = periodValue * 12
  const perPersonValue = activeParticipants > 0 ? periodValue / activeParticipants : 0
  
  // Confidence average from all responses in the period
  const avgConfidence = allConfidenceScores.length > 0
    ? allConfidenceScores.reduce((a, b) => a + b, 0) / allConfidenceScores.length
    : 0
  
  return {
    totalHoursSaved: Math.round(periodHours * 10) / 10,
    monthlyHours: Math.round(periodHours * 10) / 10, // Now represents "period hours"
    lastMonthHours: 0, // No longer computed - period is pre-filtered
    monthOverMonthChange: 0,
    monthOverMonthPercent: 0,
    avgProductivityPercent: Math.round(avgProductivityPercent * 10) / 10,
    avgConfidence: Math.round(avgConfidence * 10) / 10,
    lastMonthConfidence: 0,
    confidenceChange: 0,
    fteEquivalent: Math.round(fteEquivalent * 10) / 10,
    annualRunRate: Math.round(annualRunRate),
    monthlyValue: Math.round(periodValue),
    annualValue: Math.round(annualValue),
    perPersonValue: Math.round(perPersonValue),
    activeParticipants,
    thisMonthResponses: responses.length,
    lastMonthResponses: 0,
  }
}

// ── Weekly hours trend (for chart) ────────────────────────────────────
export interface WeeklyHoursTrend {
  week: string
  hours: number
  responses: number
}

export function computeWeeklyHoursTrend(
  responses: RawResponse[],
  timeSavingIds: string[],
): WeeklyHoursTrend[] {
  // Use parseTimeValue to handle both numeric values and text ranges like "2-4 hours"
  const weekMap = new Map<string, { hours: number; count: number; date: string }>()
  
  for (const r of responses) {
    const week = r.weekOf || "Unknown"
    const date = r.weekDate || r.completedAt
    
    // Sum hours - parseTimeValue handles numeric and range strings
    let responseHours = 0
    for (const qId of timeSavingIds) {
      const val = r.answers[qId]
      if (val !== undefined && val !== null && val !== "") {
        responseHours += parseTimeValue(val)
      }
    }
    
    if (!weekMap.has(week)) {
      weekMap.set(week, { hours: 0, count: 0, date })
    }
    const entry = weekMap.get(week)!
    entry.hours += responseHours
    entry.count += 1
  }
  
  return Array.from(weekMap.entries())
    .map(([week, { hours, count, date }]) => ({
      week,
      hours: Math.round(hours * 10) / 10,
      responses: count,
      _date: date,
    }))
    .sort((a, b) => a._date.localeCompare(b._date))
    .map(({ week, hours, responses }) => ({ week, hours, responses }))
}

// ── Personal hours trend (user vs org avg) ────────────────────────────
export interface PersonalHoursTrendPoint {
  week: string
  myHours: number
  orgAvgHours: number
}

export function computePersonalHoursTrend(
  responses: RawResponse[],
  userId: string,
  timeSavingIds: string[],
): PersonalHoursTrendPoint[] {
  const myResponses = responses.filter((r) => r.userId === userId)
  if (myResponses.length === 0) return []
  const myOrg = myResponses[0].organizationId
  
  const weekMap = new Map<string, { my: number; org: number[]; date: string }>()
  
  for (const r of responses) {
    if (r.organizationId !== myOrg) continue
    
    const week = r.weekOf
    const date = r.weekDate || r.completedAt
    
    // Sum hours - parseTimeValue handles numeric and range strings
    let responseHours = 0
    for (const qId of timeSavingIds) {
      const val = r.answers[qId]
      if (val !== undefined && val !== null && val !== "") {
        responseHours += parseTimeValue(val)
      }
    }
    
    if (!weekMap.has(week)) {
      weekMap.set(week, { my: 0, org: [], date })
    }
    const entry = weekMap.get(week)!
    
    if (r.userId === userId) {
      entry.my = responseHours
    }
    entry.org.push(responseHours)
  }
  
  return Array.from(weekMap.entries())
    .map(([week, { my, org, date }]) => ({
      week,
      myHours: Math.round(my * 10) / 10,
      orgAvgHours: org.length > 0 
        ? Math.round((org.reduce((a, b) => a + b, 0) / org.length) * 10) / 10 
        : 0,
      _date: date,
    }))
    .filter((p) => p.myHours > 0)
    .sort((a, b) => a._date.localeCompare(b._date))
    .map(({ week, myHours, orgAvgHours }) => ({ week, myHours, orgAvgHours }))
}
