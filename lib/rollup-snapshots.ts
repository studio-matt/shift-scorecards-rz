import type { Firestore } from "firebase-admin/firestore"
import type { DailyAggregate } from "@/lib/aggregates"
import type { Organization, TopPerformer, WeeklyRollupSnapshot } from "@/lib/types"
import {
  orgHoursMetricsFromAggregateStats,
  aggregateTopPerformersToTopPerformers,
} from "@/lib/dashboard-from-aggregates"
import { WEEKLY_TO_MONTHLY_MULTIPLIER } from "@/lib/dashboard-data"
import { orgAvgProductivityPercent } from "@/lib/dashboard-metrics-formulas"

export const ROLLUP_SNAPSHOTS_COLLECTION = "rollup_snapshots"
export const AGGREGATES_COLLECTION = "aggregates"

export const ROLLUP_SNAPSHOT_SCHEMA_VERSION = 1

function yyyyMmDd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function clampDaysLookback(now: Date, days: number): string {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() - days)
  return yyyyMmDd(d)
}

function subtractDaysFromYyyyMmDd(isoDay: string, days: number): string {
  const d = new Date(isoDay + "T12:00:00Z")
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Earlier of two YYYY-MM-DD strings. */
function minYyyyMmDd(a: string, b: string): string {
  return a <= b ? a : b
}

function monthKey(isoDay: string): string {
  return isoDay.slice(0, 7)
}

/** ISO week key (Monday) YYYY-MM-DD — matches dashboard-from-aggregates. */
function mondayOfDate(isoDay: string): string {
  const d = new Date(isoDay + "T12:00:00Z")
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setUTCDate(d.getUTCDate() + diff)
  return m.toISOString().split("T")[0]!
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
  const totalHoursSavedSum = params.dailies.reduce((s, d) => s + (d.totalHoursSaved || 0), 0)
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

  rows.sort(
    (a, b) =>
      b.avgProductivityPercent - a.avgProductivityPercent || b.totalHoursSaved - a.totalHoursSaved,
  )
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

function computeWeeklyTrend(params: {
  orgDailies: DailyAggregate[]
  hourlyRate: number
  maxWeeks: number
}): NonNullable<WeeklyRollupSnapshot["trendWeekly"]> {
  const byWeek = new Map<string, DailyAggregate[]>()
  for (const d of params.orgDailies) {
    const w = mondayOfDate(d.date)
    if (!byWeek.has(w)) byWeek.set(w, [])
    byWeek.get(w)!.push(d)
  }
  const keys = [...byWeek.keys()].sort().slice(-Math.max(1, params.maxWeeks))
  return keys.map((w) => {
    const bucket = byWeek.get(w) || []
    const metrics = computeOrgMetricsFromDailies({ dailies: bucket, hourlyRate: params.hourlyRate })
    return {
      bucket: w,
      scorecards: metrics.scorecards,
      totalHoursSaved: metrics.totalHoursSavedMonthly,
      avgProductivityPercent: metrics.avgProductivityPercent,
      avgConfidence: metrics.avgConfidence,
    }
  })
}

function buildPullQuotes(params: {
  headline: WeeklyRollupSnapshot["headline"]
  deltas: WeeklyRollupSnapshot["deltas"]
  hasPrevious: boolean
  period: WeeklyRollupSnapshot["period"]
}): string[] {
  const { headline, deltas, hasPrevious, period } = params
  const fmt = (n: number) => Math.round(n).toLocaleString()
  const quotes: string[] = [
    `THE HEADLINE — ${period.startDate} → ${period.endDate}: ${fmt(headline.totalHoursSaved)} hours reclaimed across ${fmt(headline.scorecards)} scorecards, at ${headline.avgProductivityPercent}% productivity and ${headline.avgConfidence.toFixed(1)}/10 confidence; annualized ${fmt(headline.annualRunRateHours)} hrs (~${headline.fteEquivalent.toFixed(1)} FTE).`,
  ]
  if (hasPrevious) {
    const dh = deltas.totalHoursSaved
    const dp = deltas.avgProductivityPercent
    const dc = deltas.avgConfidence
    quotes.push(
      `Vs prior rollup snapshot — hours ${dh >= 0 ? "+" : ""}${fmt(dh)}; productivity ${dp >= 0 ? "+" : ""}${dp.toFixed(1)} pts; confidence ${dc >= 0 ? "+" : ""}${dc.toFixed(1)}; scorecards ${deltas.scorecards >= 0 ? "+" : ""}${deltas.scorecards}.`,
    )
  }
  quotes.push(
    "Trend and regions below are computed only from memorialized /aggregates (snapshot v1); see docs/WEEKLY_ROLLUP_V2_GAPS.md for survey and editorial content.",
  )
  return quotes
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

export async function getRollupSnapshotById(
  adminDb: Firestore,
  snapshotId: string,
): Promise<WeeklyRollupSnapshot | null> {
  const doc = await adminDb.collection(ROLLUP_SNAPSHOTS_COLLECTION).doc(snapshotId).get()
  if (!doc.exists) return null
  return { id: doc.id, ...(doc.data() as Omit<WeeklyRollupSnapshot, "id">) }
}

export async function buildRollupSnapshot(args: {
  adminDb: Firestore
  organization: Pick<Organization, "id" | "name" | "hourlyRate">
  orgNameById: Map<string, string>
  periodStart: string // YYYY-MM-DD inclusive
  periodEnd: string // YYYY-MM-DD inclusive
  previous?: WeeklyRollupSnapshot | null
  createdBy?: string
}): Promise<Omit<WeeklyRollupSnapshot, "id">> {
  const { adminDb, organization, periodStart, periodEnd } = args

  const trendLookbackStart = subtractDaysFromYyyyMmDd(periodEnd, 200)
  const aggStart = minYyyyMmDd(periodStart, trendLookbackStart)

  const aggSnap = await adminDb
    .collection(AGGREGATES_COLLECTION)
    .where("organizationId", "==", organization.id)
    .where("date", ">=", aggStart)
    .where("date", "<=", periodEnd)
    .get()
  const all = aggSnap.docs.map((d) => d.data() as DailyAggregate)

  const inPeriod = (d: DailyAggregate) => d.date >= periodStart && d.date <= periodEnd

  const periodDocs = all.filter(inPeriod)
  const orgDailiesPeriod = periodDocs.filter((d) => d.department === "all" && d.userId === "all")
  const deptDailiesPeriod = periodDocs.filter((d) => d.department !== "all" && d.userId === "all")
  const userDailiesPeriod = periodDocs.filter((d) => d.userId !== "all")

  const orgDailiesTrend = all.filter((d) => d.department === "all" && d.userId === "all")

  const hourlyRate = organization.hourlyRate || 100

  const headline = computeOrgMetricsFromDailies({ dailies: orgDailiesPeriod, hourlyRate })

  const regions = computeDeptRows({ deptDailies: deptDailiesPeriod, hourlyRate }).slice(0, 12)

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

  for (const d of userDailiesPeriod) {
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

  const trend = computeMonthlyTrend({ orgDailies: orgDailiesTrend, hourlyRate, monthsBack: 6 })
  const trendWeekly = computeWeeklyTrend({ orgDailies: orgDailiesTrend, hourlyRate, maxWeeks: 12 })

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

  const headlineBlock: WeeklyRollupSnapshot["headline"] = {
    scorecards: headline.scorecards,
    totalHoursSaved: headline.totalHoursSavedMonthly,
    avgProductivityPercent: headline.avgProductivityPercent,
    avgConfidence: headline.avgConfidence,
    annualRunRateHours: headline.annualRunRateHours,
    fteEquivalent: headline.fteEquivalent,
    annualValue: headline.annualValue,
  }

  const pullQuotes = buildPullQuotes({
    headline: headlineBlock,
    deltas,
    hasPrevious: Boolean(previous),
    period: { startDate: periodStart, endDate: periodEnd },
  })

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    generatedAt: new Date().toISOString(),
    scheduleVersion: ROLLUP_SNAPSHOT_SCHEMA_VERSION,
    createdBy: args.createdBy,
    previousSnapshotId: previous?.id,
    period: { startDate: periodStart, endDate: periodEnd },
    headline: headlineBlock,
    deltas,
    trend,
    trendWeekly,
    pullQuotes,
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
