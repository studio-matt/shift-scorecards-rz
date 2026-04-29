/**
 * Cron Job: Aggregate Responses
 * 
 * Processes responses and updates pre-computed aggregates for fast dashboard loading.
 * 
 * Schedule: Every 30 minutes (see vercel.json) or Firebase Cloud Scheduler POST to same URL
 * 
 * This job:
 * 1. Finds all responses modified since last run
 * 2. Computes aggregates at org, dept, and user levels
 * 3. Stores aggregates in /aggregates collection
 * 
 * Security: Protected by BACKFILL_SECRET header
 * 
 * Last updated: 2026-04-29
 */

import { NextRequest, NextResponse } from "next/server"
import type { Firestore, Query, QueryDocumentSnapshot } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { 
  DailyAggregate, 
  buildAggregateId, 
  createEmptyAggregate,
  saveAggregateAdmin
} from "@/lib/aggregates"
import { parseMinuteValue, parseTimeValue } from "@/lib/dashboard-data"

// ── Types ─────────────────────────────────────────────────────────────

interface ProcessedResponse {
  id: string
  userId: string
  organizationId: string
  department: string
  date: string  // YYYY-MM-DD
  hoursSaved: number
  confidence: number
  templateId: string
  completedAt: string
}

interface AggregationResult {
  processedCount: number
  aggregatesUpdated: number
  errors: string[]
  duration: number
}

// ── Security ──────────────────────────────────────────────────────────

function verifyAuth(request: NextRequest): boolean {
  // Check for Vercel Cron authorization
  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }
  
  // Fallback to manual trigger with BACKFILL_SECRET
  const secretHeader = request.headers.get("X-Backfill-Secret")
  const envSecret = process.env.BACKFILL_SECRET || "shift-backfill-2026"
  if (secretHeader === envSecret) {
    return true
  }
  
  return false
}

// ── Helper Functions ──────────────────────────────────────────────────

function extractDateFromTimestamp(timestamp: string): string {
  // Convert "2026-04-28T14:30:00.000Z" to "2026-04-28"
  return timestamp.split("T")[0]
}

/** Next calendar day UTC for YYYY-MM-DD (exclusive upper bound for `completedAt`). */
function utcDayExclusiveEnd(yyyymmdd: string): string {
  const parts = yyyymmdd.split("-").map(Number)
  const y = parts[0] ?? 1970
  const mo = parts[1] ?? 1
  const da = parts[2] ?? 1
  return new Date(Date.UTC(y, mo - 1, da + 1)).toISOString()
}

const RESPONSE_PAGE_SIZE = 500

/**
 * Full collection read when `full`; otherwise Firestore `completedAt` range + pagination.
 * Matches prior behavior: `full` always loads all responses then optional in-memory `targetDate` filter.
 */
async function loadResponsesForAggregation(
  adminDb: Firestore,
  opts: { full: boolean; sinceTimestamp?: string; targetDate?: string },
): Promise<Array<{ id: string; [key: string]: unknown }>> {
  const { full, sinceTimestamp, targetDate } = opts
  const hasTarget = Boolean(targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate!))
  const hasSince = Boolean(sinceTimestamp)

  if (full) {
    const responsesSnapshot = await adminDb.collection("responses").get()
    let rows = responsesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    if (hasTarget) {
      rows = rows.filter(
        (r) => extractDateFromTimestamp(r.completedAt as string) === targetDate,
      )
    }
    return rows
  }

  /** Cold start: no `_meta.lastRunAt` yet — one-time full read */
  if (!hasSince && !hasTarget) {
    const responsesSnapshot = await adminDb.collection("responses").get()
    return responsesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  let lowerBound: string
  let upperExclusive: string | null = null

  if (hasTarget) {
    const dayStart = `${targetDate}T00:00:00.000Z`
    upperExclusive = utcDayExclusiveEnd(targetDate!)
    lowerBound = hasSince && sinceTimestamp! > dayStart ? sinceTimestamp! : dayStart
  } else {
    lowerBound = sinceTimestamp!
  }

  const out: Array<{ id: string; [key: string]: unknown }> = []

  try {
    let lastDoc: QueryDocumentSnapshot | null = null
    while (true) {
      let q: Query = adminDb
        .collection("responses")
        .where("completedAt", ">=", lowerBound)
      if (upperExclusive !== null) {
        q = q.where("completedAt", "<", upperExclusive)
      }
      q = q.orderBy("completedAt", "asc")
      if (lastDoc) q = q.startAfter(lastDoc)
      const snap = await q.limit(RESPONSE_PAGE_SIZE).get()
      if (snap.empty) break
      for (const d of snap.docs) {
        out.push({ id: d.id, ...d.data() })
      }
      lastDoc = snap.docs[snap.docs.length - 1]!
      if (snap.docs.length < RESPONSE_PAGE_SIZE) break
    }
  } catch (e) {
    console.error(
      "[Aggregate] Incremental responses query failed; falling back to full collection read:",
      e,
    )
    const responsesSnapshot = await adminDb.collection("responses").get()
    let filtered = responsesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    filtered = filtered.filter((r) => typeof r.completedAt === "string" && r.completedAt)
    filtered = filtered.filter((r) => {
      const c = r.completedAt as string
      if (upperExclusive !== null && c >= upperExclusive) return false
      return c >= lowerBound
    })
    if (hasTarget && targetDate) {
      filtered = filtered.filter(
        (r) => extractDateFromTimestamp(r.completedAt as string) === targetDate,
      )
    }
    return filtered
  }

  return out
}

async function persistMetaRun(
  adminDb: Firestore,
  processedCount: number,
  aggregatesSaved: number,
): Promise<void> {
  await adminDb.collection("aggregates").doc("_meta").set(
    {
      lastRunAt: new Date().toISOString(),
      lastProcessedCount: processedCount,
      lastAggregatesUpdated: aggregatesSaved,
    },
    { merge: true },
  )
}

// ── Main Processing ───────────────────────────────────────────────────

async function processResponses(
  sinceTimestamp: string | undefined,
  targetDate: string | undefined,
  fullMode: boolean,
): Promise<AggregationResult> {
  const startTime = Date.now()
  const errors: string[] = []
  
  console.log(`[Aggregate] Starting aggregation...`)
  console.log(`[Aggregate] Full: ${fullMode}, since: ${sinceTimestamp || "none"}, target date: ${targetDate || "all"}`)
  
  try {
    const adminDb = getAdminDb()
    
    const allResponses = await loadResponsesForAggregation(adminDb, {
      full: fullMode,
      sinceTimestamp: fullMode ? undefined : sinceTimestamp,
      targetDate,
    })
    console.log(
      `[Aggregate] Responses loaded for this run (after load strategy): ${allResponses.length}`,
    )
    
    // Get users for org/dept mapping
    const usersSnapshot = await adminDb.collection("users").get()
    const userMap = new Map<string, { orgId: string; dept: string; name: string }>()
    usersSnapshot.docs.forEach(d => {
      const data = d.data()
      userMap.set(d.id, {
        orgId: data.organizationId || "",
        dept: data.department || "Unknown",
        name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Unknown",
      })
    })
    
    // Get organizations for name mapping
    const orgsSnapshot = await adminDb.collection("organizations").get()
    const orgMap = new Map<string, string>()
    orgsSnapshot.docs.forEach(d => {
      const data = d.data()
      orgMap.set(d.id, data.name || "Unknown")
    })
    
    // Get templates for hours calculation
    const templatesSnapshot = await adminDb.collection("templates").get()
    const templateQuestionMap = new Map<string, Array<{ id: string; type: string; text: string }>>()
    templatesSnapshot.docs.forEach(d => {
      const data = d.data()
      const questions = (data.questions || []).map((q: Record<string, unknown>) => ({
        id: q.id as string,
        type: q.type as string,
        text: q.text as string,
      }))
      templateQuestionMap.set(d.id, questions)
    })
    
    const responsesToProcess = allResponses.filter((r) => {
      const completedAt = r.completedAt as string
      return Boolean(completedAt)
    })
    
    console.log(`[Aggregate] Responses to process: ${responsesToProcess.length}`)
    
    if (responsesToProcess.length === 0) {
      await persistMetaRun(adminDb, 0, 0)
      return {
        processedCount: 0,
        aggregatesUpdated: 0,
        errors: [],
        duration: Date.now() - startTime,
      }
    }
    
    // ── Process responses into aggregates ─────────────────────────────
    
    // Map to collect aggregates: key -> aggregate
    const aggregatesMap = new Map<string, DailyAggregate>()
    
    for (const response of responsesToProcess) {
      try {
        const completedAt = response.completedAt as string
        const date = extractDateFromTimestamp(completedAt)
        const templateId = response.templateId as string || ""
        const userId = response.userId as string || ""
        const answers = response.answers as Record<string, unknown> || {}
        
        // Get user's org and dept from user profile
        const userInfo = userMap.get(userId) || { orgId: "", dept: "Unknown", name: "Unknown" }
        const orgId = userInfo.orgId || response.organizationId as string || "unknown"
        const dept = userInfo.dept || "Unknown"
        const orgName = orgMap.get(orgId) || "Unknown"
        
        // Hours + confidence — align with dashboard parsing (time_saving / minutes / confidence)
        let hoursSaved = 0
        let confidence = 0
        const questions = templateQuestionMap.get(templateId) || []
        
        for (const q of questions) {
          const val = answers[q.id]
          if (val === undefined || val === null || val === "") continue
          
          const text = (q.text || "").toLowerCase()
          
          if (q.type === "time_saving") {
            hoursSaved += parseTimeValue(val as number | string)
          } else if (q.type === "time_saving_minutes") {
            hoursSaved += parseMinuteValue(val as number | string) / 60
          } else if (
            text.includes("hour") ||
            text.includes("time saved") ||
            text.includes("time saving") ||
            text.includes("minutes saved")
          ) {
            hoursSaved += parseTimeValue(val as number | string)
          }
          
          if (q.type === "confidence" || text.includes("confidence")) {
            const n = typeof val === "number" ? val : parseFloat(String(val))
            if (!Number.isNaN(n) && n >= 1 && n <= 10) {
              confidence = n
            }
          }
        }
        
        // Update aggregates at all levels
        const levels = [
          // Global level
          { orgId: "all", dept: "all", userId: "all", orgName: "All Organizations", userName: "All Users" },
          // Org level
          { orgId, dept: "all", userId: "all", orgName, userName: "All Users" },
          // Dept level
          { orgId, dept, userId: "all", orgName, userName: "All Users" },
          // User level
          { orgId, dept, userId, orgName, userName: userInfo.name },
        ]
        
        for (const level of levels) {
          const key = buildAggregateId(date, level.orgId, level.dept, level.userId)
          
          if (!aggregatesMap.has(key)) {
            // Try to load existing aggregate from DB
            const existing = await adminDb.collection("aggregates").doc(key).get()
            if (existing.exists) {
              aggregatesMap.set(key, existing.data() as DailyAggregate)
            } else {
              aggregatesMap.set(key, createEmptyAggregate(
                date, level.orgId, level.orgName, level.dept, level.userId, level.userName
              ))
            }
          }
          
          const agg = aggregatesMap.get(key)!
          
          // Only add if not already processed
          if (!agg.responseIds.includes(response.id)) {
            agg.totalHoursSaved += hoursSaved
            agg.responseCount += 1
            agg.confidenceSum += confidence
            agg.avgConfidence = agg.confidenceSum / agg.responseCount
            agg.valueCreated += hoursSaved * 50  // $50/hr default
            agg.productivityGain = (agg.totalHoursSaved / 40) * 100
            
            if (!agg.uniqueParticipantIds.includes(userId)) {
              agg.uniqueParticipantIds.push(userId)
              agg.participantCount = agg.uniqueParticipantIds.length
            }
            
            if (!agg.byTemplate[templateId]) {
              agg.byTemplate[templateId] = { responseCount: 0, hoursSaved: 0 }
            }
            agg.byTemplate[templateId].responseCount += 1
            agg.byTemplate[templateId].hoursSaved += hoursSaved
            
            agg.responseIds.push(response.id)
            agg.lastUpdatedAt = new Date().toISOString()
          }
        }
      } catch (err) {
        errors.push(`Error processing response ${response.id}: ${String(err)}`)
      }
    }
    
    // ── Save all aggregates ───────────────────────────────────────────
    
    console.log(`[Aggregate] Saving ${aggregatesMap.size} aggregates...`)
    
    let savedCount = 0
    for (const [key, aggregate] of aggregatesMap) {
      try {
        await saveAggregateAdmin(adminDb, aggregate)
        savedCount++
      } catch (err) {
        errors.push(`Error saving aggregate ${key}: ${String(err)}`)
      }
    }
    
    console.log(`[Aggregate] Saved ${savedCount} aggregates`)
    
    await persistMetaRun(adminDb, responsesToProcess.length, savedCount)
    
    return {
      processedCount: responsesToProcess.length,
      aggregatesUpdated: savedCount,
      errors,
      duration: Date.now() - startTime,
    }
    
  } catch (err) {
    console.error("[Aggregate] Fatal error:", err)
    errors.push(`Fatal error: ${String(err)}`)
    return {
      processedCount: 0,
      aggregatesUpdated: 0,
      errors,
      duration: Date.now() - startTime,
    }
  }
}

// ── API Routes ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Allow unauthenticated GET for status check
  try {
    const adminDb = getAdminDb()
    const metaSnap = await adminDb.collection("aggregates").doc("_meta").get()
    
    return NextResponse.json({
      status: "ok",
      lastRun: metaSnap.exists ? metaSnap.data() : null,
      message: "Use POST to trigger aggregation",
    })
  } catch (err) {
    return NextResponse.json({
      status: "error",
      error: String(err),
      message: "Failed to get status - check FIREBASE_SERVICE_ACCOUNT_KEY env var",
    })
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  
  // Debug: Check if env var is available
  const hasKey = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  const keyLength = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0
  console.log(`[Aggregate POST] FIREBASE_SERVICE_ACCOUNT_KEY exists: ${hasKey}, length: ${keyLength}`)
  
  const url = new URL(request.url)
  const targetDate = url.searchParams.get("date") || undefined
  const full = url.searchParams.get("full") === "true"
  
  // Get last run timestamp (unless full reprocess requested)
  let sinceTimestamp: string | undefined = undefined
  if (!full) {
    try {
      const adminDb = getAdminDb()
      const metaSnap = await adminDb.collection("aggregates").doc("_meta").get()
      if (metaSnap.exists) {
        sinceTimestamp = metaSnap.data()?.lastRunAt
      }
    } catch {
      // If we can't get last run, process everything
    }
  }
  
  console.log(`[Aggregate] POST triggered. Full: ${full}, Date: ${targetDate || "all"}`)
  
  const result = await processResponses(
    full ? undefined : sinceTimestamp,
    targetDate,
    full,
  )
  
  return NextResponse.json({
    success: result.errors.length === 0,
    ...result,
    message: result.errors.length > 0 
      ? `Completed with ${result.errors.length} errors`
      : `Successfully processed ${result.processedCount} responses into ${result.aggregatesUpdated} aggregates`,
  })
}
