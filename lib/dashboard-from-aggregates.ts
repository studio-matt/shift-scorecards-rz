/**
 * Map pre-computed /aggregates data into dashboard UI shapes without scanning raw responses.
 */
import type { AdminStats, DepartmentPerformance, TopPerformer, WeeklyTrend } from "./types"
import type {
  OrgHoursMetrics,
  PersonalTrendPoint,
  PersonalVsBenchmark,
  UserHoursMetrics,
  UserPersonalStreak,
  WeeklyHoursTrend,
} from "./dashboard-data"
import { WEEKLY_TO_MONTHLY_MULTIPLIER } from "./dashboard-data"
import {
  leaderboardPctVsFullTimeMonth,
  orgAvgProductivityPercent,
} from "./dashboard-metrics-formulas"
import type { DailyAggregate } from "./aggregates"

/** ISO week key (Monday) YYYY-MM-DD */
function mondayOfDate(isoDay: string): string {
  const d = new Date(isoDay + "T12:00:00Z")
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setUTCDate(d.getUTCDate() + diff)
  return m.toISOString().split("T")[0]
}

/** Group org-level (`userId === "all"`, `department` slice) daily rows into calendar weeks */
export function aggregateDocsToWeeklyTrend(dailies: DailyAggregate[]): WeeklyTrend[] {
  const weekMap = new Map<string, { confidenceSum: number; responseCount: number; sortKey: string }>()
  for (const a of dailies) {
    const week = mondayOfDate(a.date)
    if (!weekMap.has(week)) {
      weekMap.set(week, { confidenceSum: 0, responseCount: 0, sortKey: week })
    }
    const e = weekMap.get(week)!
    e.confidenceSum += (a.confidenceSum ?? (a.avgConfidence * a.responseCount)) || 0
    e.responseCount += a.responseCount
  }
  return Array.from(weekMap.entries())
    .map(([wk, v]) => ({
      week: `Week of ${wk}`,
      score:
        v.responseCount > 0
          ? Math.round((v.confidenceSum / v.responseCount) * 10) / 10
          : 0,
      _date: wk,
    }))
    .sort((a, b) => a._date.localeCompare(b._date))
    .map(({ week, score }) => ({ week, score }))
}

export function aggregateDocsToWeeklyHoursTrend(dailies: DailyAggregate[]): WeeklyHoursTrend[] {
  const weekMap = new Map<
    string,
    { weeklyHoursSum: number; responseCount: number; sortKey: string }
  >()
  for (const a of dailies) {
    const week = mondayOfDate(a.date)
    if (!weekMap.has(week)) {
      weekMap.set(week, { weeklyHoursSum: 0, responseCount: 0, sortKey: week })
    }
    const e = weekMap.get(week)!
    e.weeklyHoursSum += a.totalHoursSaved
    e.responseCount += a.responseCount
  }
  return Array.from(weekMap.entries())
    .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
    .map(([wk, v]) => ({
      week: `Week of ${wk}`,
      hours: Math.round(v.weeklyHoursSum * WEEKLY_TO_MONTHLY_MULTIPLIER * 10) / 10,
      responses: v.responseCount,
    }))
}

export function orgHoursMetricsFromAggregateStats(params: {
  totalHoursSavedSum: number // sum of daily weekly-hour totals across period (same semantics as rollup)
  responseCountSum: number
  avgConfidence: number
  participantCount: number
  hourlyRate: number
}): OrgHoursMetrics {
  const weeklyHoursSum = params.totalHoursSavedSum
  const monthlyHours = weeklyHoursSum * WEEKLY_TO_MONTHLY_MULTIPLIER
  const activeParticipants = params.participantCount
  const avgProductivityPercent = orgAvgProductivityPercent(monthlyHours, activeParticipants)
  const fteEquivalent = monthlyHours / 160
  const monthlyValue = monthlyHours * params.hourlyRate

  return {
    totalHoursSaved: Math.round(monthlyHours * 10) / 10,
    monthlyHours: Math.round(monthlyHours * 10) / 10,
    lastMonthHours: 0,
    monthOverMonthChange: 0,
    monthOverMonthPercent: 0,
    avgProductivityPercent: Math.round(avgProductivityPercent * 10) / 10,
    avgConfidence: Math.round(params.avgConfidence * 10) / 10,
    lastMonthConfidence: 0,
    confidenceChange: 0,
    fteEquivalent: Math.round(fteEquivalent * 10) / 10,
    annualRunRate: Math.round(monthlyHours * 12),
    monthlyValue: Math.round(monthlyValue),
    annualValue: Math.round(monthlyValue * 12),
    perPersonValue: activeParticipants > 0 ? Math.round(monthlyValue / activeParticipants) : 0,
    activeParticipants,
    thisMonthResponses: params.responseCountSum,
    lastMonthResponses: 0,
  }
}

export function adminStatsFromAggregates(params: {
  avgConfidence: number
  participantCount: number
  responseCount: number
  totalUsers: number
  totalOrgs: number
}): AdminStats {
  return {
    avgScore: Math.round(params.avgConfidence * 10) / 10,
    avgScoreChange: 0,
    completionRate:
      params.totalUsers > 0
        ? Math.round((params.participantCount / params.totalUsers) * 100)
        : 0,
    completionRateChange: 0,
    activeUsers: params.participantCount,
    activeUsersChange: 0,
    scorecardsSent: params.responseCount,
    scorecardsSentChange: 0,
    totalOrgs: params.totalOrgs,
    totalUsers: params.totalUsers,
  }
}

export function deptPerformanceRowsToDepartmentPerformance(
  rows: Array<{
    department: string
    totalHoursSaved: number
    responseCount: number
    participantCount: number
    avgConfidence: number
  }>,
  selectedDeptFilter: string | "all",
): DepartmentPerformance[] {
  const filtered =
    selectedDeptFilter === "all"
      ? rows
      : rows.filter((r) => r.department === selectedDeptFilter)
  return filtered.map((d) => ({
    department: d.department,
    avgScore: Math.round(d.avgConfidence * 10) / 10,
    participants: d.participantCount,
    trend: 0,
  }))
}

export function aggregateTopPerformersToTopPerformers(
  rows: Array<{
    userId: string
    userName: string
    organizationId: string
    department: string
    totalHoursSaved: number
    responseCount: number
    avgConfidence: number
  }>,
  orgNameById: Map<string, string>,
  displayLimit = 10,
): TopPerformer[] {
  const withMonthly = rows.map((r) => {
    const avgWeekly = r.responseCount > 0 ? r.totalHoursSaved / r.responseCount : 0
    const monthlyHours = avgWeekly * WEEKLY_TO_MONTHLY_MULTIPLIER
    return {
      ...r,
      monthlyHours,
      avgScore: Math.round(monthlyHours * 10) / 10,
    }
  })

  const ranked = withMonthly
    .map((r) => ({
      id: r.userId,
      name: r.userName,
      company: orgNameById.get(r.organizationId) ?? r.organizationId,
      companyId: r.organizationId,
      department: r.department,
      avgScore: r.avgScore,
      percentVsField: leaderboardPctVsFullTimeMonth(r.monthlyHours),
      streak: 0,
      winNarrative: undefined,
      goalNarrative: undefined,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  return ranked.slice(0, displayLimit)
}

export function userHoursMetricsFromUserAggregates(params: {
  periodDays: DailyAggregate[]
  userId: string
}): UserHoursMetrics {
  let totalHours = 0
  let responseCount = 0
  let confidenceSum = 0
  for (const a of params.periodDays) {
    totalHours += a.totalHoursSaved
    responseCount += a.responseCount
    confidenceSum += a.confidenceSum || a.avgConfidence * a.responseCount
  }
  const avgConf = responseCount > 0 ? confidenceSum / responseCount : 0
  const weeklyAvg = responseCount > 0 ? totalHours / responseCount : 0
  return {
    totalHoursSavedAllTime: Math.round(totalHours * 10) / 10,
    thisMonthHours: Math.round(totalHours * WEEKLY_TO_MONTHLY_MULTIPLIER * 10) / 10,
    lastMonthHours: 0,
    monthOverMonthChange: 0,
    monthOverMonthPercent: 0,
    weeklyAvgHours: Math.round(weeklyAvg * 10) / 10,
    productivityPercent: Math.round((weeklyAvg / 40) * 1000) / 10,
    responseCount,
    thisMonthResponses: responseCount,
    lastMonthResponses: 0,
    confidenceScore: Math.round(avgConf * 10) / 10,
    lastMonthConfidence: 0,
    confidenceChange: 0,
  }
}

/** Weekly confidence trajectory from user's daily rollup rows vs flat cohort averages. */
export function personalTrendFromUserAggregates(
  userDays: DailyAggregate[],
  cohortAvgConfidence: number,
): PersonalTrendPoint[] {
  const weekMap = new Map<string, { confidenceSum: number; responseCount: number }>()
  for (const a of userDays) {
    const wk = mondayOfDate(a.date)
    if (!weekMap.has(wk)) weekMap.set(wk, { confidenceSum: 0, responseCount: 0 })
    const e = weekMap.get(wk)!
    e.confidenceSum += a.confidenceSum ?? a.avgConfidence * a.responseCount
    e.responseCount += a.responseCount
  }
  return Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([wk, v]) => ({
      week: `Week of ${wk}`,
      myScore:
        v.responseCount > 0
          ? Math.round((v.confidenceSum / v.responseCount) * 10) / 10
          : 0,
      deptAvg: Math.round(cohortAvgConfidence * 10) / 10,
      orgAvg: Math.round(cohortAvgConfidence * 10) / 10,
    }))
}

export function personalBenchmarkApprox(
  params: {
    myAvgConfidence: number
    orgAvgConfidence: number
    departmentLabel: string
  },
): PersonalVsBenchmark {
  const orgAvg = Math.round(params.orgAvgConfidence * 10) / 10
  return {
    myAvg: Math.round(params.myAvgConfidence * 10) / 10,
    deptAvg: orgAvg,
    orgAvg,
    deptName: params.departmentLabel,
    myVelocity: 0,
    percentile: orgAvg <= 0 ? 100 : Math.min(100, Math.round((params.myAvgConfidence / orgAvg) * 50)),
  }
}

/** Distinct active weeks; streak approximated as max consecutive calendar weeks in data. */
export function streakApproxFromUserAggregates(userDays: DailyAggregate[]): UserPersonalStreak {
  const activeWeeks = userDays
    .filter((a) => a.responseCount > 0)
    .map((a) => mondayOfDate(a.date))
  const uniq = [...new Set(activeWeeks)].sort((a, b) => a.localeCompare(b))
  const totalResponses = userDays.reduce((s, d) => s + d.responseCount, 0)
  if (uniq.length === 0) {
    return { currentStreak: 0, maxStreak: 0, totalResponses, totalWeeks: 0 }
  }
  let maxRun = 1
  let curRun = 1
  for (let i = 1; i < uniq.length; i++) {
    const gap = weekDiffDays(uniq[i - 1]!, uniq[i]!)
    if (gap > 0 && gap <= 10) {
      curRun++
      maxRun = Math.max(maxRun, curRun)
    } else {
      curRun = 1
    }
  }
  return {
    currentStreak: curRun,
    maxStreak: maxRun,
    totalResponses,
    totalWeeks: uniq.length,
  }
}

function weekDiffDays(a: string, b: string): number {
  return Math.round(
    (Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / (24 * 60 * 60 * 1000),
  )
}
