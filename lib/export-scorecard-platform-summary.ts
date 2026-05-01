import { parseMinuteValue, parseTimeValue, WEEKLY_TO_MONTHLY_MULTIPLIER } from "./dashboard-data"
import {
  leaderboardPctVsFullTimeMonth,
  orgAvgProductivityPercent,
  rollupMaxWeeklyHoursClaimPerUserWeek,
} from "./dashboard-metrics-formulas"
import type {
  ExportResponseRow,
  ExportTemplateQuestion,
  RespondentContact,
} from "./export-scorecard-responses-csv"

export interface ExportOrganizationSummary {
  id: string
  name: string
  hourlyRate?: number | string
}

export interface PlatformSummaryTopPerformer {
  rank: number
  userId: string
  name: string
  email: string
  regionOrCohort: string
  responseCount: number
  weeksSubmitted: number
  weeklyHours: number
  monthlyHours: number
  productivityPercent: number
}

export interface PlatformSummaryMetrics {
  organizationId: string
  organizationName: string
  responseCount: number
  activeParticipants: number
  hourlyRate: number
  weeklyHours: number
  monthlyHours: number
  avgProductivityPercent: number
  monthlyValue: number
  annualValue: number
  avgConfidence: number
  confidenceDistribution: {
    score1To3: number
    score4To6: number
    score7To8: number
    score9To10: number
  }
  topPerformers: PlatformSummaryTopPerformer[]
}

const DEFAULT_EXPORT_HOURLY_RATE = 100

function csvEscape(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function parseHourlyRate(value: number | string | undefined): number {
  const rate = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""))
  return Number.isFinite(rate) ? rate : DEFAULT_EXPORT_HOURLY_RATE
}

function isTimeSavingQuestion(q: ExportTemplateQuestion): boolean {
  if (q.type === "time_saving") return true
  if (q.type === "time_saving_minutes") return false
  const text = (q.text || "").toLowerCase()
  return (
    text.includes("hour") ||
    text.includes("time saved") ||
    text.includes("time saving") ||
    text.includes("minutes saved")
  )
}

function isMinutesSavingQuestion(q: ExportTemplateQuestion): boolean {
  return q.type === "time_saving_minutes"
}

function isConfidenceQuestion(q: ExportTemplateQuestion): boolean {
  const text = (q.text || "").toLowerCase()
  return q.type === "confidence" || text.includes("confidence")
}

function questionIdsByType(
  templateQuestionsByTemplateId: Map<string, ExportTemplateQuestion[]>,
): {
  timeSavingIds: string[]
  minutesSavingIds: string[]
  confidenceIds: string[]
} {
  const timeSavingIds = new Set<string>()
  const minutesSavingIds = new Set<string>()
  const confidenceIds = new Set<string>()

  for (const questions of templateQuestionsByTemplateId.values()) {
    for (const q of questions) {
      if (isMinutesSavingQuestion(q)) minutesSavingIds.add(q.id)
      else if (isTimeSavingQuestion(q)) timeSavingIds.add(q.id)
      if (isConfidenceQuestion(q)) confidenceIds.add(q.id)
    }
  }

  return {
    timeSavingIds: [...timeSavingIds],
    minutesSavingIds: [...minutesSavingIds],
    confidenceIds: [...confidenceIds],
  }
}

function responseWeeklyHours(
  response: ExportResponseRow,
  timeSavingIds: string[],
  minutesSavingIds: string[],
): number {
  let hours = 0
  for (const qId of timeSavingIds) {
    const val = response.answers[qId]
    if (val !== undefined && val !== null && val !== "") {
      hours += parseTimeValue(val)
    }
  }
  for (const qId of minutesSavingIds) {
    const val = response.answers[qId]
    if (val !== undefined && val !== null && val !== "") {
      hours += parseMinuteValue(val) / 60
    }
  }
  return hours
}

function confidenceScores(
  responses: ExportResponseRow[],
  confidenceIds: string[],
): number[] {
  const scores: number[] = []
  for (const response of responses) {
    for (const qId of confidenceIds) {
      const val = response.answers[qId]
      const score = typeof val === "number" ? val : Number.parseFloat(String(val ?? ""))
      if (Number.isFinite(score) && score >= 1 && score <= 10) {
        scores.push(score)
      }
    }
  }
  return scores
}

export function buildPlatformSummaryMetrics(params: {
  responses: ExportResponseRow[]
  templateQuestionsByTemplateId: Map<string, ExportTemplateQuestion[]>
  respondentByUserId: Record<string, RespondentContact>
  organization: ExportOrganizationSummary
  topPerformerLimit?: number
}): PlatformSummaryMetrics {
  const {
    responses,
    templateQuestionsByTemplateId,
    respondentByUserId,
    organization,
    topPerformerLimit = 10,
  } = params
  const { timeSavingIds, minutesSavingIds, confidenceIds } = questionIdsByType(
    templateQuestionsByTemplateId,
  )
  const hourlyRate = parseHourlyRate(organization.hourlyRate)

  const weeklyHours = rollupMaxWeeklyHoursClaimPerUserWeek(
    responses,
    timeSavingIds,
    minutesSavingIds,
    parseTimeValue,
    parseMinuteValue,
  )
  const monthlyHours = weeklyHours * WEEKLY_TO_MONTHLY_MULTIPLIER
  const activeParticipants = new Set(responses.map((r) => r.userId).filter(Boolean)).size
  const avgProductivityPercent = orgAvgProductivityPercent(monthlyHours, activeParticipants)
  const monthlyValue = monthlyHours * hourlyRate
  const scores = confidenceScores(responses, confidenceIds)

  const byUser = new Map<
    string,
    {
      totalHours: number
      responseCount: number
      weeks: Set<string>
    }
  >()

  for (const response of responses) {
    const contact = respondentByUserId[response.userId]
    if (contact?.excludeFromReporting) continue
    const name = contact?.name?.trim()
    if (!name || name === "Unknown") continue

    if (!byUser.has(response.userId)) {
      byUser.set(response.userId, { totalHours: 0, responseCount: 0, weeks: new Set() })
    }
    const entry = byUser.get(response.userId)!
    entry.totalHours += responseWeeklyHours(response, timeSavingIds, minutesSavingIds)
    entry.responseCount += 1
    if (response.weekOf) entry.weeks.add(response.weekOf)
  }

  const topPerformers = [...byUser.entries()]
    .map(([userId, entry]) => {
      const weeklyAvg = entry.responseCount > 0 ? entry.totalHours / entry.responseCount : 0
      const monthly = weeklyAvg * WEEKLY_TO_MONTHLY_MULTIPLIER
      const contact = respondentByUserId[userId]
      return {
        userId,
        name: contact?.name ?? "Unknown",
        email: contact?.email ?? "",
        regionOrCohort: contact?.regionOrCohort ?? "",
        responseCount: entry.responseCount,
        weeksSubmitted: entry.weeks.size,
        weeklyHours: round1(weeklyAvg),
        monthlyHours: round1(monthly),
        productivityPercent: leaderboardPctVsFullTimeMonth(monthly),
      }
    })
    .sort((a, b) => b.monthlyHours - a.monthlyHours)
    .slice(0, topPerformerLimit)
    .map((performer, index) => ({ rank: index + 1, ...performer }))

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    responseCount: responses.length,
    activeParticipants,
    hourlyRate,
    weeklyHours: round1(weeklyHours),
    monthlyHours: round1(monthlyHours),
    avgProductivityPercent: round1(avgProductivityPercent),
    monthlyValue: Math.round(monthlyValue),
    annualValue: Math.round(monthlyValue * 12),
    avgConfidence:
      scores.length > 0 ? round1(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
    confidenceDistribution: {
      score1To3: scores.filter((score) => score >= 1 && score <= 3).length,
      score4To6: scores.filter((score) => score >= 4 && score <= 6).length,
      score7To8: scores.filter((score) => score >= 7 && score <= 8).length,
      score9To10: scores.filter((score) => score >= 9 && score <= 10).length,
    },
    topPerformers,
  }
}

export function buildPlatformSummaryCsv(params: {
  metrics: PlatformSummaryMetrics
  generatedAt?: string
}): string {
  const { metrics, generatedAt = new Date().toISOString() } = params
  const rows: string[] = []

  rows.push(["Section", "Metric", "Value", "Notes"].map(csvEscape).join(","))
  rows.push(
    [
      "Organization",
      "Organization",
      metrics.organizationName,
      `ID: ${metrics.organizationId}`,
    ].map(csvEscape).join(","),
  )
  rows.push(["Organization", "Generated At", generatedAt, ""].map(csvEscape).join(","))
  rows.push(
    ["Headline", "Responses", metrics.responseCount, "Completed responses in export"]
      .map(csvEscape)
      .join(","),
  )
  rows.push(
    ["Headline", "Active Participants", metrics.activeParticipants, "Unique respondent user IDs"]
      .map(csvEscape)
      .join(","),
  )
  rows.push(
    ["Headline", "Weekly Hours", metrics.weeklyHours, "Max claim per user/week"]
      .map(csvEscape)
      .join(","),
  )
  rows.push(
    ["Headline", "Monthly Hours", metrics.monthlyHours, "Weekly hours x 4"]
      .map(csvEscape)
      .join(","),
  )
  rows.push(
    [
      "Headline",
      "Avg Productivity Percent",
      metrics.avgProductivityPercent,
      "Monthly hours / (participants x 160)",
    ].map(csvEscape).join(","),
  )
  rows.push(
    ["Headline", "Hourly Rate", metrics.hourlyRate, "Selected organization's configured rate"]
      .map(csvEscape)
      .join(","),
  )
  rows.push(
    ["Headline", "Monthly Value", metrics.monthlyValue, "Monthly hours x hourly rate"]
      .map(csvEscape)
      .join(","),
  )
  rows.push(
    ["Headline", "Annualized Value", metrics.annualValue, "Monthly value x 12"]
      .map(csvEscape)
      .join(","),
  )
  rows.push(
    ["Headline", "Avg Confidence", metrics.avgConfidence, "Confidence answers, 1-10 only"]
      .map(csvEscape)
      .join(","),
  )
  rows.push(
    ["Confidence", "Score 1-3", metrics.confidenceDistribution.score1To3, ""]
      .map(csvEscape)
      .join(","),
  )
  rows.push(
    ["Confidence", "Score 4-6", metrics.confidenceDistribution.score4To6, ""]
      .map(csvEscape)
      .join(","),
  )
  rows.push(
    ["Confidence", "Score 7-8", metrics.confidenceDistribution.score7To8, ""]
      .map(csvEscape)
      .join(","),
  )
  rows.push(
    ["Confidence", "Score 9-10", metrics.confidenceDistribution.score9To10, ""]
      .map(csvEscape)
      .join(","),
  )
  rows.push("")
  rows.push(
    [
      "Top Performer Rank",
      "Name",
      "Email",
      "Region / Cohort",
      "Hrs/Week",
      "Hrs/Month",
      "Productivity %",
      "Responses",
      "Weeks Submitted",
    ].map(csvEscape).join(","),
  )

  for (const performer of metrics.topPerformers) {
    rows.push(
      [
        performer.rank,
        performer.name,
        performer.email,
        performer.regionOrCohort,
        performer.weeklyHours,
        performer.monthlyHours,
        performer.productivityPercent,
        performer.responseCount,
        performer.weeksSubmitted,
      ].map(csvEscape).join(","),
    )
  }

  return rows.join("\n")
}
