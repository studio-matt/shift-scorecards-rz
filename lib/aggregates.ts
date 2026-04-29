/**
 * Aggregates Module
 * 
 * Pre-computed daily statistics for fast dashboard loading.
 * Instead of fetching 35K+ responses, the dashboard reads from aggregates.
 * 
 * Collection: /aggregates/{docId}
 * DocId format: {date}_{orgId}_{deptId}_{userId}
 * 
 * Aggregation levels:
 * - Global:     2026-04-28_all_all_all
 * - Org:        2026-04-28_orgXYZ_all_all
 * - Dept:       2026-04-28_orgXYZ_Sales_all
 * - User:       2026-04-28_orgXYZ_Sales_user123
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where,
  Timestamp
} from "firebase/firestore"
import { db } from "./firebase"
import type { Firestore as AdminFirestore } from "firebase-admin/firestore"

// ── Types ─────────────────────────────────────────────────────────────

export interface DailyAggregate {
  // Identifier fields
  date: string              // "2026-04-28"
  organizationId: string    // org ID or "all"
  organizationName: string  // "Alera Group" or "All Organizations"
  department: string        // department name or "all"
  userId: string            // user ID or "all"
  userName: string          // "John Doe" or "All Users"
  
  // Metrics
  totalHoursSaved: number
  responseCount: number
  avgConfidence: number
  confidenceSum: number     // For recalculating avg when merging
  valueCreated: number      // hours * hourly rate
  productivityGain: number  // Percentage
  
  // Participant tracking
  uniqueParticipantIds: string[]  // Array of user IDs who submitted
  participantCount: number
  
  // Template breakdown (optional, for detailed analysis)
  byTemplate: Record<string, {
    responseCount: number
    hoursSaved: number
  }>
  
  // Metadata
  lastUpdatedAt: string     // ISO timestamp
  responseIds: string[]     // IDs of responses included (for verification)
}

export interface AggregateQuery {
  startDate: string         // "2026-04-01"
  endDate: string           // "2026-04-28"
  organizationId?: string   // Filter by org (or "all")
  department?: string       // Filter by dept (or "all")
  userId?: string           // Filter by user (or "all")
}

// ── Constants ─────────────────────────────────────────────────────────

const AGGREGATES_COLLECTION = "aggregates"
const DEFAULT_HOURLY_RATE = 50  // Default $/hr for value calculations

// ── Helper Functions ──────────────────────────────────────────────────

export function buildAggregateId(
  date: string,
  orgId: string = "all",
  dept: string = "all", 
  userId: string = "all"
): string {
  // Sanitize department name (remove special chars that could break doc ID)
  const safeDept = dept.replace(/[\/\\]/g, "-")
  return `${date}_${orgId}_${safeDept}_${userId}`
}

export function parseAggregateId(docId: string): {
  date: string
  orgId: string
  dept: string
  userId: string
} {
  const parts = docId.split("_")
  return {
    date: parts[0] || "",
    orgId: parts[1] || "all",
    dept: parts[2] || "all",
    userId: parts[3] || "all",
  }
}

export function createEmptyAggregate(
  date: string,
  orgId: string = "all",
  orgName: string = "All Organizations",
  dept: string = "all",
  userId: string = "all",
  userName: string = "All Users"
): DailyAggregate {
  return {
    date,
    organizationId: orgId,
    organizationName: orgName,
    department: dept,
    userId,
    userName,
    totalHoursSaved: 0,
    responseCount: 0,
    avgConfidence: 0,
    confidenceSum: 0,
    valueCreated: 0,
    productivityGain: 0,
    uniqueParticipantIds: [],
    participantCount: 0,
    byTemplate: {},
    lastUpdatedAt: new Date().toISOString(),
    responseIds: [],
  }
}

// ── Read Operations ───────────────────────────────────────────────────

/**
 * Fetch a single aggregate document
 */
export async function getAggregate(
  date: string,
  orgId: string = "all",
  dept: string = "all",
  userId: string = "all"
): Promise<DailyAggregate | null> {
  const docId = buildAggregateId(date, orgId, dept, userId)
  const docRef = doc(db, AGGREGATES_COLLECTION, docId)
  const snap = await getDoc(docRef)
  if (!snap.exists()) return null
  return snap.data() as DailyAggregate
}

/**
 * Fetch aggregates for a date range with exact org/dept/user slice.
 *
 * Prefers indexed queries (matches `organizationId`, `department`, `userId`, `date`)
 * instead of scanning all aggregate docs by date-only.
 */
export async function getAggregatesForRange(
  opts: AggregateQuery
): Promise<DailyAggregate[]> {
  const { startDate, endDate, organizationId = "all", department = "all", userId = "all" } = opts

  try {
    const q = query(
      collection(db, AGGREGATES_COLLECTION),
      where("organizationId", "==", organizationId),
      where("department", "==", department),
      where("userId", "==", userId),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => d.data() as DailyAggregate)
  } catch (err) {
    console.warn("[aggregates] Indexed slice query failed, falling back to date scan:", err)
    const q = query(
      collection(db, AGGREGATES_COLLECTION),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((d) => d.data() as DailyAggregate)
      .filter(
        (a) =>
          a.organizationId === organizationId &&
          a.department === department &&
          a.userId === userId,
      )
  }
}

/**
 * All daily rows for a user in a date range (userId + date index).
 * User-level docs have a specific `department` (not `all`); org rollups have `userId` "all" and are excluded.
 */
export async function getAggregatesForUserDateRange(opts: {
  startDate: string
  endDate: string
  userId: string
  organizationId?: string
}): Promise<DailyAggregate[]> {
  const q = query(
    collection(db, AGGREGATES_COLLECTION),
    where("userId", "==", opts.userId),
    where("date", ">=", opts.startDate),
    where("date", "<=", opts.endDate),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((d) => d.data() as DailyAggregate)
    .filter((a) => {
      if (a.userId === "all") return false
      if (opts.organizationId && a.organizationId !== opts.organizationId) return false
      return a.department !== "all"
    })
}

/**
 * Sum aggregates across a date range into a single stats object
 */
export function sumAggregates(aggregates: DailyAggregate[]): {
  totalHoursSaved: number
  responseCount: number
  avgConfidence: number
  valueCreated: number
  productivityGain: number
  participantCount: number
  uniqueParticipantIds: string[]
} {
  const allParticipantIds = new Set<string>()
  
  const totals = aggregates.reduce((acc, agg) => {
    acc.totalHoursSaved += agg.totalHoursSaved
    acc.responseCount += agg.responseCount
    acc.confidenceSum += agg.confidenceSum ?? (agg.avgConfidence * agg.responseCount)
    acc.valueCreated += agg.valueCreated
    
    // Collect unique participants across all days
    agg.uniqueParticipantIds.forEach(id => allParticipantIds.add(id))
    
    return acc
  }, {
    totalHoursSaved: 0,
    responseCount: 0,
    confidenceSum: 0,
    valueCreated: 0,
  })
  
  const avgConfidence = totals.responseCount > 0 
    ? totals.confidenceSum / totals.responseCount 
    : 0
  
  // Productivity gain = (hours saved / 40 hours per week) * 100
  const productivityGain = (totals.totalHoursSaved / 40) * 100
  
  return {
    totalHoursSaved: totals.totalHoursSaved,
    responseCount: totals.responseCount,
    avgConfidence,
    valueCreated: totals.valueCreated,
    productivityGain,
    participantCount: allParticipantIds.size,
    uniqueParticipantIds: Array.from(allParticipantIds),
  }
}

// ── Write Operations ──────────────────────────────────────────────────

/**
 * Save an aggregate document (client-side)
 */
export async function saveAggregate(aggregate: DailyAggregate): Promise<void> {
  const docId = buildAggregateId(
    aggregate.date,
    aggregate.organizationId,
    aggregate.department,
    aggregate.userId
  )
  const docRef = doc(db, AGGREGATES_COLLECTION, docId)
  await setDoc(docRef, {
    ...aggregate,
    lastUpdatedAt: new Date().toISOString(),
  })
}

/**
 * Save an aggregate document using Admin SDK (server-side)
 * This bypasses security rules and should only be used in server contexts
 */
export async function saveAggregateAdmin(
  adminDb: AdminFirestore,
  aggregate: DailyAggregate
): Promise<void> {
  const docId = buildAggregateId(
    aggregate.date,
    aggregate.organizationId,
    aggregate.department,
    aggregate.userId
  )
  await adminDb.collection(AGGREGATES_COLLECTION).doc(docId).set({
    ...aggregate,
    lastUpdatedAt: new Date().toISOString(),
  })
}

// ══════════════════════════════════════════════════════════════════════════
// DASHBOARD FUNCTIONS - Fast reads using pre-computed aggregates
// ══════════════════════════════════════════════════════════════════════════

/**
 * Get dashboard stats from aggregates (FAST - no raw response fetching)
 * Returns main stat card data: hours saved, response count, participants, etc.
 */
export async function getDashboardStats(opts: {
  startDate: string
  endDate: string
  organizationId?: string
  department?: string
}): Promise<{
  totalHoursSaved: number
  responseCount: number
  avgConfidence: number
  valueCreated: number
  productivityGain: number
  participantCount: number
  uniqueParticipantIds: string[]
} | null> {
  const aggregates = await getAggregatesForRange({
    startDate: opts.startDate,
    endDate: opts.endDate,
    organizationId: opts.organizationId || "all",
    department: opts.department || "all",
    userId: "all",
  })
  
  if (aggregates.length === 0) return null
  return sumAggregates(aggregates)
}

/**
 * Get weekly trend from aggregates (FAST)
 * Returns array of weekly stats for charting
 */
export async function getWeeklyTrendFromAggregates(opts: {
  weeks: number  // Number of weeks to fetch
  organizationId?: string
  department?: string
}): Promise<Array<{
  weekLabel: string
  weekStart: string
  totalHoursSaved: number
  responseCount: number
  participantCount: number
  avgConfidence: number
}>> {
  const results: Array<{
    weekLabel: string
    weekStart: string
    totalHoursSaved: number
    responseCount: number
    participantCount: number
    avgConfidence: number
  }> = []
  
  const now = new Date()
  
  for (let i = opts.weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - (i * 7))
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 6)
    
    const startStr = weekStart.toISOString().split('T')[0]
    const endStr = weekEnd.toISOString().split('T')[0]
    
    const aggregates = await getAggregatesForRange({
      startDate: startStr,
      endDate: endStr,
      organizationId: opts.organizationId || "all",
      department: opts.department || "all",
      userId: "all",
    })
    
    const stats = sumAggregates(aggregates)
    
    results.push({
      weekLabel: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      weekStart: startStr,
      ...stats,
    })
  }
  
  return results
}

/**
 * Get top performers from user-level aggregates (FAST)
 * Returns ranked list of users by hours saved
 */
export async function getTopPerformersFromAggregates(opts: {
  startDate: string
  endDate: string
  organizationId?: string
  department?: string
  /** If set, cap list (for UI). Omit to return full cohort for % vs field. */
  limit?: number
}): Promise<Array<{
  userId: string
  userName: string
  organizationId: string
  department: string
  totalHoursSaved: number
  responseCount: number
  avgConfidence: number
}>> {
  let allDocs: DailyAggregate[]

  if (opts.organizationId && opts.organizationId !== "all") {
    const q = query(
      collection(db, AGGREGATES_COLLECTION),
      where("organizationId", "==", opts.organizationId),
      where("date", ">=", opts.startDate),
      where("date", "<=", opts.endDate),
    )
    const snapshot = await getDocs(q)
    allDocs = snapshot.docs.map((d) => d.data() as DailyAggregate)
  } else {
    const q = query(
      collection(db, AGGREGATES_COLLECTION),
      where("date", ">=", opts.startDate),
      where("date", "<=", opts.endDate),
    )
    const snapshot = await getDocs(q)
    allDocs = snapshot.docs.map((d) => d.data() as DailyAggregate)
  }

  // Filter to user-level aggregates only (userId != "all")
  let userAggregates = allDocs.filter(
    (a) =>
      a.userId !== "all" &&
      (opts.organizationId === "all" ||
        opts.organizationId === undefined ||
        a.organizationId === opts.organizationId) &&
      (opts.department === "all" ||
        opts.department === undefined ||
        a.department === opts.department),
  )

  // Group by userId and sum
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

  for (const agg of userAggregates) {
    const existing = userMap.get(agg.userId)
    if (existing) {
      existing.totalHoursSaved += agg.totalHoursSaved
      existing.responseCount += agg.responseCount
      existing.confidenceSum += agg.confidenceSum ?? agg.avgConfidence * agg.responseCount
    } else {
      userMap.set(agg.userId, {
        userId: agg.userId,
        userName: agg.userName,
        organizationId: agg.organizationId,
        department: agg.department,
        totalHoursSaved: agg.totalHoursSaved,
        responseCount: agg.responseCount,
        confidenceSum: agg.confidenceSum ?? agg.avgConfidence * agg.responseCount,
      })
    }
  }

  const sorted = Array.from(userMap.values())
    .map((u) => ({
      ...u,
      avgConfidence: u.responseCount > 0 ? u.confidenceSum / u.responseCount : 0,
    }))
    .sort((a, b) => b.totalHoursSaved - a.totalHoursSaved)

  if (opts.limit != null) {
    return sorted.slice(0, opts.limit)
  }
  return sorted
}

/**
 * Get department performance from aggregates (FAST)
 */
export async function getDepartmentPerformanceFromAggregates(opts: {
  startDate: string
  endDate: string
  organizationId?: string
}): Promise<Array<{
  department: string
  totalHoursSaved: number
  responseCount: number
  participantCount: number
  avgConfidence: number
}>> {
  let allDocs: DailyAggregate[]

  if (opts.organizationId && opts.organizationId !== "all") {
    const q = query(
      collection(db, AGGREGATES_COLLECTION),
      where("organizationId", "==", opts.organizationId),
      where("date", ">=", opts.startDate),
      where("date", "<=", opts.endDate),
    )
    const snapshot = await getDocs(q)
    allDocs = snapshot.docs.map((d) => d.data() as DailyAggregate)
  } else {
    const q = query(
      collection(db, AGGREGATES_COLLECTION),
      where("date", ">=", opts.startDate),
      where("date", "<=", opts.endDate),
    )
    const snapshot = await getDocs(q)
    allDocs = snapshot.docs.map((d) => d.data() as DailyAggregate)
  }

  // Filter to department-level (dept != "all", userId == "all")
  const deptAggregates = allDocs.filter(
    (a) =>
      a.department !== "all" &&
      a.userId === "all" &&
      (opts.organizationId === "all" ||
        opts.organizationId === undefined ||
        a.organizationId === opts.organizationId),
  )
  
  // Group by department and sum
  const deptMap = new Map<string, {
    department: string
    totalHoursSaved: number
    responseCount: number
    confidenceSum: number
    participantIds: Set<string>
  }>()
  
  for (const agg of deptAggregates) {
    const existing = deptMap.get(agg.department)
    if (existing) {
      existing.totalHoursSaved += agg.totalHoursSaved
      existing.responseCount += agg.responseCount
      existing.confidenceSum += agg.confidenceSum ?? agg.avgConfidence * agg.responseCount
      agg.uniqueParticipantIds.forEach(id => existing.participantIds.add(id))
    } else {
      deptMap.set(agg.department, {
        department: agg.department,
        totalHoursSaved: agg.totalHoursSaved,
        responseCount: agg.responseCount,
        confidenceSum: agg.confidenceSum ?? agg.avgConfidence * agg.responseCount,
        participantIds: new Set(agg.uniqueParticipantIds),
      })
    }
  }
  
  return Array.from(deptMap.values())
    .map(d => ({
      department: d.department,
      totalHoursSaved: d.totalHoursSaved,
      responseCount: d.responseCount,
      participantCount: d.participantIds.size,
      avgConfidence: d.responseCount > 0 ? d.confidenceSum / d.responseCount : 0,
    }))
    .sort((a, b) => b.totalHoursSaved - a.totalHoursSaved)
}

// ══════════════════════════════════════════════════════════════════════════

/**
 * Merge a new response into an existing aggregate
 */
export function mergeResponseIntoAggregate(
  aggregate: DailyAggregate,
  response: {
    id: string
    userId: string
    hoursSaved: number
    confidence: number
    templateId: string
    hourlyRate?: number
  }
): DailyAggregate {
  const rate = response.hourlyRate || DEFAULT_HOURLY_RATE
  const updatedParticipants = aggregate.uniqueParticipantIds.includes(response.userId)
    ? aggregate.uniqueParticipantIds
    : [...aggregate.uniqueParticipantIds, response.userId]
  
  const updatedByTemplate = { ...aggregate.byTemplate }
  if (!updatedByTemplate[response.templateId]) {
    updatedByTemplate[response.templateId] = { responseCount: 0, hoursSaved: 0 }
  }
  updatedByTemplate[response.templateId].responseCount += 1
  updatedByTemplate[response.templateId].hoursSaved += response.hoursSaved
  
  const newResponseCount = aggregate.responseCount + 1
  const newConfidenceSum = aggregate.confidenceSum + response.confidence
  
  return {
    ...aggregate,
    totalHoursSaved: aggregate.totalHoursSaved + response.hoursSaved,
    responseCount: newResponseCount,
    confidenceSum: newConfidenceSum,
    avgConfidence: newConfidenceSum / newResponseCount,
    valueCreated: aggregate.valueCreated + (response.hoursSaved * rate),
    productivityGain: ((aggregate.totalHoursSaved + response.hoursSaved) / 40) * 100,
    uniqueParticipantIds: updatedParticipants,
    participantCount: updatedParticipants.length,
    byTemplate: updatedByTemplate,
    responseIds: [...aggregate.responseIds, response.id],
    lastUpdatedAt: new Date().toISOString(),
  }
}
