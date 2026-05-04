import { dateLikeToIsoString } from "./date-utils"

export interface ScorecardPeriodResponse {
  id?: string
  userId?: string
  releaseId?: string
  templateId?: string
  templateName?: string
  weekOf?: string
  completedAt?: unknown
  updatedAt?: unknown
  createdAt?: unknown
  status?: string
}

export interface CompletionDateRange {
  startDate?: string
  endDate?: string
}

export interface ScorecardPeriod<T> {
  key: string
  label: string
  sortAt: string
  responses: T[]
}

export interface ScorecardPeriodSelection<T> {
  currentPeriod: ScorecardPeriod<T> | null
  previousPeriod: ScorecardPeriod<T> | null
  currentResponses: T[]
  previousResponses: T[]
  eligibleResponses: T[]
}

function isYmd(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

function inclusiveEndIso(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString()
}

function completedIso(response: ScorecardPeriodResponse): string {
  return dateLikeToIsoString(response.completedAt)
}

export function completionDateLabel(range: CompletionDateRange): string {
  const hasStart = isYmd(range.startDate)
  const hasEnd = isYmd(range.endDate)
  if (hasStart && hasEnd) return `Responses completed ${range.startDate} to ${range.endDate}`
  if (hasStart) return `Responses completed since ${range.startDate}`
  if (hasEnd) return `Responses completed through ${range.endDate}`
  return "Responses completed through today"
}

export function responseMatchesCompletionDateRange(
  response: ScorecardPeriodResponse,
  range: CompletionDateRange,
): boolean {
  const completedAt = completedIso(response)
  if (!completedAt) return false
  if (isYmd(range.startDate) && completedAt < `${range.startDate}T00:00:00.000Z`) return false
  if (isYmd(range.endDate) && completedAt >= inclusiveEndIso(range.endDate)) return false
  return completedAt <= new Date().toISOString()
}

function periodKey(response: ScorecardPeriodResponse): string {
  if (response.releaseId) return `release:${response.releaseId}`
  if (response.weekOf) return `week:${response.weekOf}`
  const completedAt = completedIso(response)
  const day = completedAt.slice(0, 10)
  return `legacy:${response.templateId || response.templateName || "scorecard"}:${day || response.id || "unknown"}`
}

function periodLabel(response: ScorecardPeriodResponse): string {
  if (response.weekOf) return `Scorecard ${response.weekOf}`
  const completedAt = completedIso(response)
  if (completedAt) return `Scorecard ${completedAt.slice(0, 10)}`
  return response.templateName || "Scorecard"
}

export function selectScorecardPeriods<T extends ScorecardPeriodResponse>(
  responses: T[],
  range: CompletionDateRange = {},
): ScorecardPeriodSelection<T> {
  const eligibleResponses = responses.filter((response) => {
    const status = response.status || ""
    return (
      (status === "completed" || Boolean(completedIso(response))) &&
      responseMatchesCompletionDateRange(response, range)
    )
  })

  const byKey = new Map<string, ScorecardPeriod<T>>()
  for (const response of eligibleResponses) {
    const key = periodKey(response)
    const sortAt = completedIso(response) || dateLikeToIsoString(response.updatedAt) || dateLikeToIsoString(response.createdAt)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, {
        key,
        label: periodLabel(response),
        sortAt,
        responses: [response],
      })
      continue
    }
    existing.responses.push(response)
    if (sortAt > existing.sortAt) existing.sortAt = sortAt
  }

  const periods = Array.from(byKey.values()).sort((a, b) => b.sortAt.localeCompare(a.sortAt))
  const currentPeriod = periods[0] ?? null
  const previousPeriod = periods[1] ?? null

  return {
    currentPeriod,
    previousPeriod,
    currentResponses: currentPeriod?.responses ?? [],
    previousResponses: previousPeriod?.responses ?? [],
    eligibleResponses,
  }
}
