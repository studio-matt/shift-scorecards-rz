import type { Firestore } from "firebase-admin/firestore"
import type { DailyAggregate } from "@/lib/aggregates"
import type { Organization, TopPerformer, WeeklyRollupSnapshot } from "@/lib/types"
import {
  aggregateDocsToWeeklyHoursTrend,
  orgHoursMetricsFromAggregateStats,
  aggregateTopPerformersToTopPerformers,
} from "@/lib/dashboard-from-aggregates"
import { WEEKLY_TO_MONTHLY_MULTIPLIER } from "@/lib/dashboard-data"
import { orgAvgProductivityPercent } from "@/lib/dashboard-metrics-formulas"

export const ROLLUP_SNAPSHOTS_COLLECTION = "rollup_snapshots"
export const AGGREGATES_COLLECTION = "aggregates"

function yyyyMmDd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function clampDaysLookback(now: Date, days: number): string {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() - days)
  return yyyyMmDd(d)
}

function monthKey(isoDay: string): string {
  return isoDay.slice(0, 7)
}

function sumConfidence(agg: DailyAggregate): number {
  return (agg.confidenceSum ?? agg.avgConfidence * agg.responseCount) || 0
}

function computeOrgMetricsFromDailies(params: {
  dailies: DailyAggregate[]
  hourlyRate: number
}): {
  scorecards: number
  totalHoursSavedMonthly: number
  avgProductivityPercent: number
  avgConfidence: number
  annualRunRateHours: number
  fteEquivalent: number
  annualValue: number
} {
  const responseCountSum = params.dailies.reduce((s, d) => s + (d.responseCount || 0), 0)
  const totalHoursSavedSum = params.dailies.reduce((s, d) => s + (d.totalHoursSaved || 0), 0) // weekly-hour totals across days
  const confidenceSum = params.dailies.reduce((s, d) => s + sumConfidence(d), 0)
  const avgConfidence = responseCountSum > 0 ? confidenceSum / responseCountSum : 0
  const participants = new Set<string>()
  for (const d of params.dailies) {
    for (const id of d.uniqueParticipantIds || []) participants.add(id)
  }

  const hours = orgHoursMetricsFromAggregateStats({
    totalHoursSavedSum,
    responseCountSum,
    avgConfidence,
    participantCount: participants.size,
    hourlyRate: params.hourlyRate,
  })

  return {
    scorecards: responseCountSum,
    totalHoursSavedMonthly: hours.totalHoursSaved,
    avgProductivityPercent: hours.avgProductivityPercent,
    avgConfidence: hours.avgConfidence,
    annualRunRateHours: hours.annualRunRate,
    fteEquivalent: hours.fteEquivalent,
    annualValue: hours.annualValue,
  }
}

function computeDeptRows(params: {
  deptDailies: DailyAggregate[]
  hourlyRate: number
}): WeeklyRollupSnapshot["regions"] {
  // Group dept-level (userId=all, dept!=all) by department, summing weekly-hour totals.
  const map = new Map<
    string,
    {
      department: string
      totalHoursSavedWeeklySum: number
      responseCount: number
      confidenceSum: number
      participantIds: Set<string>
    }
  >()

  for (const d of params.deptDailies) {
    const dept = d.department || "Unknown"
    if (dept === "all") continue
    if (!map.has(dept)) {
      map.set(dept, {
        department: dept,
        totalHoursSavedWeeklySum: 0,
        responseCount: 0,
        confidenceSum: 0,
        participantIds: new Set<string>(),
      })
    }
    const e = map.get(dept)!
    e.totalHoursSavedWeeklySum += d.totalHoursSaved || 0
    e.responseCount += d.responseCount || 0
    e.confidenceSum += sumConfidence(d)
    for (const id of d.uniqueParticipantIds || []) e.participantIds.add(id)
  }

  const rows = Array.from(map.values()).map((r) => {
    const monthlyHours = r.totalHoursSavedWeeklySum * WEEKLY_TO_MONTHLY_MULTIPLIER
    const avgConfidence = r.responseCount > 0 ? r.confidenceSum / r.responseCount : 0
    const productivity = orgAvgProductivityPercent(monthlyHours, r.participantIds.size)
    return {
      department: r.department,
      scorecards: r.responseCount,
      totalHoursSaved: Math.round(monthlyHours * 10) / 10,
      avgProductivityPercent: Math.round(productivity * 10) / 10,
      avgConfidence: Math.round(avgConfidence * 10) / 10,
    }
  })

  rows.sort((a, b) => (b.avgProductivityPercent - a.avgProductivityPercent) || (b.totalHoursSaved - a.totalHoursSaved))
  return rows
}

function computeMonthlyTrend(params: {
  orgDailies: DailyAggregate[]
  hourlyRate: number
  monthsBack: number
}): WeeklyRollupSnapshot["trend"] {
  const byMonth = new Map<string, DailyAggregate[]>()
  for (const d of params.orgDailies) {
    const m = monthKey(d.date)
    if (!byMonth.has(m)) byMonth.set(m, [])
    byMonth.get(m)!.push(d)
  }
  const keys = [...byMonth.keys()].sort().slice(-Math.max(1, params.monthsBack))
  return keys.map((m) => {
    const bucket = byMonth.get(m) || []
    const metrics = computeOrgMetricsFromDailies({ dailies: bucket, hourlyRate: params.hourlyRate })
    return {
      bucket: m,
      scorecards: metrics.scorecards,
      totalHoursSaved: metrics.totalHoursSavedMonthly,
      avgProductivityPercent: metrics.avgProductivityPercent,
      avgConfidence: metrics.avgConfidence,
    }
  })
}

export async function getLatestRollupSnapshotForOrg(
  adminDb: Firestore,
  organizationId: string,
): Promise<WeeklyRollupSnapshot | null> {
  const snap = await adminDb
    .collection(ROLLUP_SNAPSHOTS_COLLECTION)
    .where("organizationId", "==", organizationId)
    .orderBy("generatedAt", "desc")
    .limit(1)
    .get()
  if (snap.empty) return null
  const d = snap.docs[0]!
  return { id: d.id, ...(d.data() as Omit<WeeklyRollupSnapshot, "id">) }
}

export async function buildRollupSnapshot(args: {
  adminDb: Firestore
  organization: Pick<Organization, "id" | "name" | "hourlyRate">
  orgNameById: Map<string, string>
  periodStart: string // YYYY-MM-DD inclusive
  periodEnd: string // YYYY-MM-DD inclusive
  previous?: WeeklyRollupSnapshot | null
}): Promise<Omit<WeeklyRollupSnapshot, "id">> {
  const { adminDb, organization, periodStart, periodEnd } = args

  // Load all org aggregates for the date range (all levels), then filter in-memory.
  const aggSnap = await adminDb
    .collection(AGGREGATES_COLLECTION)
    .where("organizationId", "==", organization.id)
    .where("date", ">=", periodStart)
    .where("date", "<=", periodEnd)
    .get()
  const all = aggSnap.docs.map((d) => d.data() as DailyAggregate)

  const orgDailies = all.filter((d) => d.department === "all" && d.userId === "all")
  const deptDailies = all.filter((d) => d.department !== "all" && d.userId === "all")
  const userDailies = all.filter((d) => d.userId !== "all")

  const hourlyRate = organization.hourlyRate || 100

  const headline = computeOrgMetricsFromDailies({ dailies: orgDailies, hourlyRate })

  const regions = computeDeptRows({ deptDailies, hourlyRate }).slice(0, 12)

  // Leaderboard: we reuse the existing mapping helper but need "top performers rows" shape.
  // We build that from user-level daily aggregates by userId.
  const userMap = new Map<
    string,
    {
      userId: string
      userName: string
      organizationId: string
      department: string
      totalHoursSaved: number
      responseCount: number
      confidenceSum: number
    }
  >()

  for (const d of userDailies) {
    const key = d.userId
    if (!key) continue
    if (!userMap.has(key)) {
      userMap.set(key, {
        userId: d.userId,
        userName: d.userName,
        organizationId: d.organizationId,
        department: d.department,
        totalHoursSaved: 0,
        responseCount: 0,
        confidenceSum: 0,
      })
    }
    const e = userMap.get(key)!
    e.totalHoursSaved += d.totalHoursSaved || 0
    e.responseCount += d.responseCount || 0
    e.confidenceSum += sumConfidence(d)
  }

  const performerRows = Array.from(userMap.values())
    .map((u) => ({
      userId: u.userId,
      userName: u.userName,
      organizationId: u.organizationId,
      department: u.department,
      totalHoursSaved: u.totalHoursSaved,
      responseCount: u.responseCount,
      avgConfidence: u.responseCount > 0 ? u.confidenceSum / u.responseCount : 0,
    }))
    .sort((a, b) => b.totalHoursSaved - a.totalHoursSaved)

  const leaderboard: TopPerformer[] = aggregateTopPerformersToTopPerformers(
    performerRows,
    args.orgNameById,
    50,
  )

  const trend = computeMonthlyTrend({ orgDailies, hourlyRate, monthsBack: 6 })

  const previous = args.previous || null
  const deltas = previous
    ? {
        totalHoursSaved: headline.totalHoursSavedMonthly - previous.headline.totalHoursSaved,
        avgProductivityPercent: headline.avgProductivityPercent - previous.headline.avgProductivityPercent,
        avgConfidence: headline.avgConfidence - previous.headline.avgConfidence,
        scorecards: headline.scorecards - previous.headline.scorecards,
      }
    : {
        totalHoursSaved: 0,
        avgProductivityPercent: 0,
        avgConfidence: 0,
        scorecards: 0,
      }

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    generatedAt: new Date().toISOString(),
    previousSnapshotId: previous?.id,
    period: { startDate: periodStart, endDate: periodEnd },
    headline: {
      scorecards: headline.scorecards,
      totalHoursSaved: headline.totalHoursSavedMonthly,
      avgProductivityPercent: headline.avgProductivityPercent,
      avgConfidence: headline.avgConfidence,
      annualRunRateHours: headline.annualRunRateHours,
      fteEquivalent: headline.fteEquivalent,
      annualValue: headline.annualValue,
    },
    deltas,
    trend,
    regions,
    leaderboard,
  }
}

export async function saveRollupSnapshot(
  adminDb: Firestore,
  snapshot: Omit<WeeklyRollupSnapshot, "id">,
): Promise<string> {
  const ref = await adminDb.collection(ROLLUP_SNAPSHOTS_COLLECTION).add(snapshot)
  return ref.id
}

export function defaultRollupPeriod(args: {
  now?: Date
  previous?: WeeklyRollupSnapshot | null
}): { startDate: string; endDate: string } {
  const now = args.now ?? new Date()
  const endDate = yyyyMmDd(now)
  const startDate = args.previous?.period?.endDate
    ? args.previous.period.endDate
    : clampDaysLookback(now, 7)
  return { startDate, endDate }
}

