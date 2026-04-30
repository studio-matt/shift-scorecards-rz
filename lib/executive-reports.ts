import type { Firestore } from "firebase-admin/firestore"
import type { DayOfWeek, ExecutiveReportSchedule } from "@/lib/types"

const DAY_NUM: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

function isoDate(d: Date): string {
  return d.toISOString()
}

function parseTimeOfDay(timeOfDay: string): { hours: number; minutes: number } {
  const [h, m] = String(timeOfDay || "").split(":").map((n) => parseInt(n, 10))
  return {
    hours: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 9,
    minutes: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  }
}

function formatInTimeZoneParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
  const parts = fmt.formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value
  return {
    year: parseInt(get("year") || "1970", 10),
    month: parseInt(get("month") || "1", 10),
    day: parseInt(get("day") || "1", 10),
    hour: parseInt(get("hour") || "0", 10),
    minute: parseInt(get("minute") || "0", 10),
  }
}

/**
 * Convert a "local time in IANA timezone" to a UTC Date.
 * Small iterative method that handles DST shifts without extra deps.
 */
function zonedDateTimeToUtcDate(args: {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  timeZone: string
}): Date {
  const { year, month, day, hour, minute, timeZone } = args
  // Initial guess: treat local as UTC.
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0))
  for (let i = 0; i < 3; i++) {
    const p = formatInTimeZoneParts(guess, timeZone)
    // Difference between what guess looks like in tz vs what we want.
    const wanted = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
    const seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0)
    const deltaMs = seen - wanted
    if (Math.abs(deltaMs) < 30_000) break
    guess = new Date(guess.getTime() - deltaMs)
  }
  return guess
}

function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function startOfUtcDay(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function startOfWeekUtc(date: Date): Date {
  const d = startOfUtcDay(date)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - day)
  return d
}

export function computeNextScheduledAt(
  schedule: ExecutiveReportSchedule,
  now = new Date(),
): string {
  if (!schedule.enabled) return ""
  const timeZone = schedule.timezone || "UTC"
  const { hours, minutes } = parseTimeOfDay(schedule.timeOfDay)
  const allowedDays = (schedule.daysOfWeek || [])
    .map((d) => DAY_NUM[d])
    .filter((n) => Number.isFinite(n))
  const intervalWeeks = Math.max(1, Math.min(26, Math.floor(schedule.intervalWeeks || 1)))

  const anchorIso =
    schedule.anchorDate && /^\d{4}-\d{2}-\d{2}$/.test(schedule.anchorDate)
      ? `${schedule.anchorDate}T00:00:00.000Z`
      : schedule.lastGeneratedAt || schedule.nextScheduledAt || ""
  const anchor = anchorIso ? new Date(anchorIso) : now
  const anchorWeekStart = startOfWeekUtc(anchor)

  // Search forward up to ~6 months for the next valid slot.
  for (let deltaDay = 0; deltaDay < 7 * 26; deltaDay++) {
    // Candidate day in UTC, but we'll interpret its weekday in the timezone.
    const candidateUtcDay = addDaysUTC(startOfUtcDay(now), deltaDay)
    const parts = formatInTimeZoneParts(candidateUtcDay, timeZone)
    // Determine tz weekday by formatting in tz and using a Date that matches those parts.
    const asUtcFromTzMidnight = zonedDateTimeToUtcDate({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 0,
      minute: 0,
      timeZone,
    })
    const tzWeekday = formatInTimeZoneParts(asUtcFromTzMidnight, timeZone) // stable parts for that local day
    // We still need actual weekday number in tz; easiest is Intl weekday short.
    const weekdayStr = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(
      asUtcFromTzMidnight,
    )
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    }
    const tzDow = weekdayMap[weekdayStr] ?? 1
    if (allowedDays.length > 0 && !allowedDays.includes(tzDow)) continue

    const candidateLocalUtc = zonedDateTimeToUtcDate({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: hours,
      minute: minutes,
      timeZone,
    })

    // Interval gating: only allow weeks where weeksSinceAnchor % intervalWeeks == 0
    const candidateWeekStart = startOfWeekUtc(candidateLocalUtc)
    const weeksSinceAnchor = Math.floor(
      (candidateWeekStart.getTime() - anchorWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000),
    )
    if (weeksSinceAnchor < 0) continue
    if (weeksSinceAnchor % intervalWeeks !== 0) continue
    if (candidateLocalUtc.getTime() <= now.getTime()) continue

    return isoDate(candidateLocalUtc)
  }

  // Fallback: 7 days out at the same time
  const fallback = addDaysUTC(now, 7)
  const p = formatInTimeZoneParts(fallback, timeZone)
  return isoDate(
    zonedDateTimeToUtcDate({
      year: p.year,
      month: p.month,
      day: p.day,
      hour: hours,
      minute: minutes,
      timeZone,
    }),
  )
}

function monthKeyFromISO(iso: string): string {
  // YYYY-MM-DD...
  return iso.slice(0, 7)
}

function within(iso: string, startInc: string, endEx: string): boolean {
  return iso >= startInc && iso < endEx
}

function filterResponsesBetween(responses: RawResponse[], startInc: string, endEx: string): RawResponse[] {
  return responses.filter((r) => {
    const c = String(r.completedAt || "")
    if (!c) return false
    return within(c, startInc, endEx)
  })
}

function buildMonthlyTrend(
  responses: RawResponse[],
  timeSavingIds: string[],
  confidenceIds: string[],
  minutesSavingIds: string[],
  hourlyRate: number,
): ExecutiveReportSnapshot["trend"] {
  const byMonth = new Map<string, RawResponse[]>()
  for (const r of responses) {
    const c = String(r.completedAt || "")
    if (!c) continue
    const key = monthKeyFromISO(c)
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(r)
  }
  const months = [...byMonth.keys()].sort()
  return months.map((m) => {
    const bucket = byMonth.get(m) || []
    const metrics = computeOrgHoursMetrics(bucket, timeSavingIds, confidenceIds, hourlyRate, minutesSavingIds)
    return {
      month: m,
      scorecards: bucket.length,
      monthlyHoursSaved: metrics.totalHoursSaved,
      avgProductivityPercent: metrics.avgProductivityPercent,
      avgConfidence: metrics.avgConfidence,
    }
  })
}

function buildRegions(
  responses: RawResponse[],
  departments: string[],
  timeSavingIds: string[],
  confidenceIds: string[],
  minutesSavingIds: string[],
  hourlyRate: number,
): ExecutiveReportSnapshot["regions"] {
  const byDept = new Map<string, RawResponse[]>()
  for (const r of responses) {
    const dept = String((r as unknown as { department?: string }).department || "Unknown")
    if (!byDept.has(dept)) byDept.set(dept, [])
    byDept.get(dept)!.push(r)
  }
  const keys = [...new Set([...departments, ...byDept.keys()])].filter(Boolean)
  const rows = keys.map((dept) => {
    const bucket = byDept.get(dept) || []
    const metrics = computeOrgHoursMetrics(bucket, timeSavingIds, confidenceIds, hourlyRate, minutesSavingIds)
    return {
      department: dept,
      scorecards: bucket.length,
      monthlyHoursSaved: metrics.totalHoursSaved,
      avgProductivityPercent: metrics.avgProductivityPercent,
      avgConfidence: metrics.avgConfidence,
    }
  })
  // Sort by productivity desc, then hours desc
  rows.sort((a, b) => (b.avgProductivityPercent - a.avgProductivityPercent) || (b.monthlyHoursSaved - a.monthlyHoursSaved))
  return rows
}

export async function generateExecutiveReportSnapshot(args: {
  adminDb: Firestore
  organization: Pick<Organization, "id" | "name" | "departments" | "hourlyRate">
  responses: RawResponse[]
  period: { startInclusive: string; endExclusive: string }
  generatedAt?: Date
}): Promise<Omit<ExecutiveReportSnapshot, "id">> {
  const { adminDb, organization, responses, period } = args
  const generatedAt = args.generatedAt ?? new Date()

  const [timeSavingIds, minutesSavingIds, confidenceIds] = await Promise.all([
    findTimeSavingQuestionIds(),
    findTimeSavingMinutesQuestionIds(),
    findConfidenceQuestionIds(),
  ])

  const hourlyRate = organization.hourlyRate || 100
  const periodResponses = filterResponsesBetween(responses, period.startInclusive, period.endExclusive)

  const headlineMetrics = computeOrgHoursMetrics(
    periodResponses,
    timeSavingIds,
    confidenceIds,
    hourlyRate,
    minutesSavingIds,
  )

  // Prior period for deltas (same duration immediately preceding).
  const startMs = new Date(period.startInclusive).getTime()
  const endMs = new Date(period.endExclusive).getTime()
  const durationMs = Math.max(1, endMs - startMs)
  const prevStart = new Date(startMs - durationMs).toISOString()
  const prevEnd = new Date(startMs).toISOString()
  const prevResponses = filterResponsesBetween(responses, prevStart, prevEnd)
  const prevMetrics = computeOrgHoursMetrics(
    prevResponses,
    timeSavingIds,
    confidenceIds,
    hourlyRate,
    minutesSavingIds,
  )

  const trend = buildMonthlyTrend(
    responses,
    timeSavingIds,
    confidenceIds,
    minutesSavingIds,
    hourlyRate,
  ).slice(-6)

  const regions = buildRegions(
    periodResponses,
    organization.departments || [],
    timeSavingIds,
    confidenceIds,
    minutesSavingIds,
    hourlyRate,
  ).slice(0, 10)

  const leaderboard = (await computeTopPerformers(periodResponses)).slice(0, 50)

  // Persist minimal doc; caller sets ID.
  return {
    organizationId: organization.id,
    organizationName: organization.name,
    period,
    generatedAt: generatedAt.toISOString(),
    headline: {
      scorecards: periodResponses.length,
      totalHoursSaved: headlineMetrics.totalHoursSaved,
      avgProductivityPercent: headlineMetrics.avgProductivityPercent,
      avgConfidence: headlineMetrics.avgConfidence,
      annualRunRateHours: headlineMetrics.annualRunRate,
      fteEquivalent: headlineMetrics.fteEquivalent,
      annualValue: headlineMetrics.annualValue,
    },
    deltas: {
      hoursSaved: headlineMetrics.totalHoursSaved - prevMetrics.totalHoursSaved,
      productivityPoints: headlineMetrics.avgProductivityPercent - prevMetrics.avgProductivityPercent,
    },
    trend,
    regions,
    leaderboard,
  }
}

export async function saveExecutiveReportSnapshot(
  adminDb: Firestore,
  snapshot: Omit<ExecutiveReportSnapshot, "id">,
): Promise<string> {
  const ref = await adminDb.collection(EXEC_REPORT_COLLECTION).add(snapshot)
  return ref.id
}

export async function getLatestExecutiveReportForOrg(
  adminDb: Firestore,
  organizationId: string,
): Promise<ExecutiveReportSnapshot | null> {
  const snap = await adminDb
    .collection(EXEC_REPORT_COLLECTION)
    .where("organizationId", "==", organizationId)
    .orderBy("generatedAt", "desc")
    .limit(1)
    .get()
  if (snap.empty) return null
  const d = snap.docs[0]!
  return { id: d.id, ...(d.data() as Omit<ExecutiveReportSnapshot, "id">) }
}

