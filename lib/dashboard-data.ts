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

// ── Engagement: Streak tracking ───────────────────────────────────────
export interface UserStreak {
  userId: string
  name: string
  department: string
  currentStreak: number
  maxStreak: number
  totalResponses: number
}

export function computeStreaks(responses: RawResponse[]): UserStreak[] {
  const userMap = new Map<string, { name: string; dept: string; weeks: Set<string>; total: number }>()
  for (const r of responses) {
    if (!userMap.has(r.userId)) userMap.set(r.userId, { name: r.userName || r.userId, dept: r.department, weeks: new Set(), total: 0 })
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

export async function computeNonResponders(responses: RawResponse[]): Promise<NonResponder[]> {
  const allUsers = await getDocuments(COLLECTIONS.USERS)
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

export function computeScoreVelocity(responses: RawResponse[]): ScoreVelocity[] {
  const userWeeks = new Map<string, { name: string; dept: string; weeks: Map<string, { total: number; count: number; date: string }> }>()
  for (const r of responses) {
    if (!userWeeks.has(r.userId)) userWeeks.set(r.userId, { name: r.userName, dept: r.department, weeks: new Map() })
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
}

export function computeDepartmentVariance(responses: RawResponse[]): DepartmentVariance[] {
  const deptScores = new Map<string, number[]>()
  for (const r of responses) {
    const dept = r.department || "Unknown"
    if (!deptScores.has(dept)) deptScores.set(dept, [])
    const scaleVals = Object.values(r.answers).filter((v) => typeof v === "number" && v >= 1 && v <= 10) as number[]
    if (scaleVals.length === 0) continue
    deptScores.get(dept)!.push(scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length)
  }
  return Array.from(deptScores.entries()).map(([department, scores]) => {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length
    return { department, avgScore: Math.round(mean * 10) / 10, stdDev: Math.round(Math.sqrt(variance) * 100) / 100, responseCount: scores.length }
  }).sort((a, b) => b.stdDev - a.stdDev)
}

// ── Trend: Question correlation ───────────────────────────────────────
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

export function computeDeptOverTime(responses: RawResponse[]): DeptOverTime[] {
  const weekDeptMap = new Map<string, Map<string, { total: number; count: number }>>()
  const allDepts = new Set<string>()
  for (const r of responses) {
    const dept = r.department || "Unknown"
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
    if (d.avgScore < 5.0) alerts.push({ type: "low_score", severity: d.avgScore < 4.0 ? "critical" : "warning", entity: d.department, entityType: "department", message: `${d.department} avg score is ${d.avgScore}/10`, value: d.avgScore })
  }
  for (const v of velocities) {
    if (v.velocity < -0.3) alerts.push({ type: "declining", severity: v.velocity < -0.6 ? "critical" : "warning", entity: v.name, entityType: "user", message: `${v.name} scores declining at ${v.velocity}/week`, value: v.velocity })
  }
  return alerts.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1))
}

// ══════════════════════════════════════════════════════════════════════
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
  const percentile = allUserAvgs.length > 1 ? Math.round((belowMe / (allUserAvgs.length - 1)) * 100) : 50

  // My velocity
  const vel = computeScoreVelocity(myResponses)
  const myVel = vel.find((v) => v.userId === userId)

  return {
    myAvg: Math.round(myAvg * 10) / 10,
    deptAvg: Math.round(deptAvg * 10) / 10,
    orgAvg: Math.round(orgAvg * 10) / 10,
    deptName: myDept,
    myVelocity: myVel?.velocity ?? 0,
    percentile,
  }
}
