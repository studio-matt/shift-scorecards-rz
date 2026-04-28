/**
 * Cron Job: Aggregate Responses
 * 
 * Processes responses and updates pre-computed aggregates for fast dashboard loading.
 * 
 * Schedule: Hourly M-F 6am-8pm, every 4 hours otherwise (configured in vercel.json)
 * 
 * This job:
 * 1. Finds all responses modified since last run
 * 2. Computes aggregates at org, dept, and user levels
 * 3. Stores aggregates in /aggregates collection
 * 
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from "next/server"
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  where,
  orderBy,
  Timestamp 
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { 
  DailyAggregate, 
  buildAggregateId, 
  createEmptyAggregate,
  saveAggregate 
} from "@/lib/aggregates"

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

function parseTimeValue(val: unknown): number {
  if (typeof val === "number") return val
  if (typeof val === "string") {
    const num = parseFloat(val)
    return isNaN(num) ? 0 : num
  }
  return 0
}

// ── Main Processing ───────────────────────────────────────────────────

async function processResponses(
  sinceTimestamp?: string,
  targetDate?: string  // Optional: only process responses for this date
): Promise<AggregationResult> {
  const startTime = Date.now()
  const errors: string[] = []
  
  console.log(`[Aggregate] Starting aggregation...`)
  console.log(`[Aggregate] Since: ${sinceTimestamp || "all time"}`)
  console.log(`[Aggregate] Target date: ${targetDate || "all dates"}`)
  
  try {
    // ── Fetch all necessary data ──────────────────────────────────────
    
    // Get responses
    const responsesSnapshot = await getDocs(collection(db, "responses"))
    const allResponses = responsesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    console.log(`[Aggregate] Total responses in DB: ${allResponses.length}`)
    
    // Get users for org/dept mapping
    const usersSnapshot = await getDocs(collection(db, "users"))
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
    const orgsSnapshot = await getDocs(collection(db, "organizations"))
    const orgMap = new Map<string, string>()
    orgsSnapshot.docs.forEach(d => {
      const data = d.data()
      orgMap.set(d.id, data.name || "Unknown")
    })
    
    // Get templates for hours calculation
    const templatesSnapshot = await getDocs(collection(db, "templates"))
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
    
    // ── Filter responses to process ───────────────────────────────────
    
    let responsesToProcess = allResponses.filter(r => {
      const completedAt = r.completedAt as string
      if (!completedAt) return false
      
      // Filter by sinceTimestamp if provided
      if (sinceTimestamp && completedAt < sinceTimestamp) return false
      
      // Filter by targetDate if provided
      if (targetDate) {
        const responseDate = extractDateFromTimestamp(completedAt)
        if (responseDate !== targetDate) return false
      }
      
      return true
    })
    
    console.log(`[Aggregate] Responses to process: ${responsesToProcess.length}`)
    
    if (responsesToProcess.length === 0) {
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
        
        // Calculate hours saved from answers
        let hoursSaved = 0
        let confidence = 0
        const questions = templateQuestionMap.get(templateId) || []
        
        for (const q of questions) {
          const text = (q.text || "").toLowerCase()
          const isTimeSaving = q.type === "time_saving" ||
            text.includes("hour") ||
            text.includes("time saved") ||
            text.includes("time saving") ||
            text.includes("minutes saved")
          
          const isConfidence = q.type === "confidence" || text.includes("confidence")
          
          const val = answers[q.id]
          if (val !== undefined && val !== null && val !== "") {
            if (isTimeSaving) {
              hoursSaved += parseTimeValue(val)
            }
            if (isConfidence) {
              confidence = parseTimeValue(val)
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
            const docRef = doc(db, "aggregates", key)
            const existing = await getDoc(docRef)
            if (existing.exists()) {
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
        await saveAggregate(aggregate)
        savedCount++
      } catch (err) {
        errors.push(`Error saving aggregate ${key}: ${String(err)}`)
      }
    }
    
    console.log(`[Aggregate] Saved ${savedCount} aggregates`)
    
    // ── Update last run timestamp ─────────────────────────────────────
    
    const metaRef = doc(db, "aggregates", "_meta")
    await setDoc(metaRef, {
      lastRunAt: new Date().toISOString(),
      lastProcessedCount: responsesToProcess.length,
      lastAggregatesUpdated: savedCount,
    }, { merge: true })
    
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
  const metaRef = doc(db, "aggregates", "_meta")
  const metaSnap = await getDoc(metaRef)
  
  return NextResponse.json({
    status: "ok",
    lastRun: metaSnap.exists() ? metaSnap.data() : null,
    message: "Use POST to trigger aggregation",
  })
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  
  const url = new URL(request.url)
  const targetDate = url.searchParams.get("date") || undefined
  const full = url.searchParams.get("full") === "true"
  
  // Get last run timestamp (unless full reprocess requested)
  let sinceTimestamp: string | undefined = undefined
  if (!full) {
    const metaRef = doc(db, "aggregates", "_meta")
    const metaSnap = await getDoc(metaRef)
    if (metaSnap.exists()) {
      sinceTimestamp = metaSnap.data().lastRunAt
    }
  }
  
  console.log(`[Aggregate] POST triggered. Full: ${full}, Date: ${targetDate || "all"}`)
  
  const result = await processResponses(full ? undefined : sinceTimestamp, targetDate)
  
  return NextResponse.json({
    success: result.errors.length === 0,
    ...result,
    message: result.errors.length > 0 
      ? `Completed with ${result.errors.length} errors`
      : `Successfully processed ${result.processedCount} responses into ${result.aggregatesUpdated} aggregates`,
  })
}
