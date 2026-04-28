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
 * Fetch aggregates for a date range
 * Returns aggregates matching the filters
 */
export async function getAggregatesForRange(
  opts: AggregateQuery
): Promise<DailyAggregate[]> {
  const { startDate, endDate, organizationId = "all", department = "all", userId = "all" } = opts
  
  // Query all aggregates matching org/dept/user filters within date range
  const q = query(
    collection(db, AGGREGATES_COLLECTION),
    where("organizationId", "==", organizationId),
    where("department", "==", department),
    where("userId", "==", userId),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => d.data() as DailyAggregate)
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
    acc.confidenceSum += agg.confidenceSum
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
 * Save an aggregate document
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
