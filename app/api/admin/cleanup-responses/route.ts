import { NextResponse } from "next/server"
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { COLLECTIONS } from "@/lib/firestore"

/**
 * Cleanup API - Keeps responses from Rob Levine Law + 1 from Envoy Design
 * Updates all dates to current date so everything appears as most recent
 * 
 * GET /api/admin/cleanup-responses - Preview current state
 * POST /api/admin/cleanup-responses - Execute cleanup
 * POST /api/admin/cleanup-responses?dryRun=true - Preview what would happen
 */

// Known org IDs
const ROB_LEVINE_ORG_ID = "n1pjEpYGFxOqdsByYE0w"
const ENVOY_ORG_ID = "fCgurfXsXG76MxmNEGyS"

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get("dryRun") === "true"
    const confirmDelete = searchParams.get("confirm") === "true"
    const deleteAll = searchParams.get("deleteAll") === "true"
    
    // Safety: require explicit confirmation
    if (!dryRun && !confirmDelete) {
      return NextResponse.json({
        error: "Safety check: Add ?confirm=true to actually delete. Use ?dryRun=true to preview first.",
        hint: "Run: fetch('/api/admin/cleanup-responses?dryRun=true', { method: 'POST' }).then(r => r.json()).then(console.log)"
      }, { status: 400 })
    }
    
    // Option to delete ALL responses for a fresh start
    if (deleteAll && confirmDelete) {
      const responsesRef = collection(db, COLLECTIONS.RESPONSES)
      const snapshot = await getDocs(responsesRef)
      
      if (dryRun) {
        return NextResponse.json({
          message: `Dry run: Would delete ALL ${snapshot.size} responses`,
          count: snapshot.size,
        })
      }
      
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, COLLECTIONS.RESPONSES, docSnap.id))
      }
      
      return NextResponse.json({
        success: true,
        message: `Deleted ALL ${snapshot.size} responses`,
        deleted: snapshot.size,
      })
    }

    // Fetch all responses
    const responsesRef = collection(db, COLLECTIONS.RESPONSES)
    const snapshot = await getDocs(responsesRef)
    
    if (snapshot.empty) {
      return NextResponse.json({ 
        message: "No responses found in database",
        deleted: 0,
        kept: 0,
      })
    }

    // Categorize responses
    const toDelete: string[] = []
    const toKeep: { id: string; orgId: string; userId: string }[] = []
    let envoyKept = false

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data()
      const orgId = data.organizationId || ""
      const userId = data.userId || ""
      
      if (orgId === ROB_LEVINE_ORG_ID) {
        // Keep ALL Rob Levine responses
        toKeep.push({ id: docSnap.id, orgId, userId })
      } else if (orgId === ENVOY_ORG_ID) {
        // Keep only ONE Envoy response
        if (!envoyKept) {
          toKeep.push({ id: docSnap.id, orgId, userId })
          envoyKept = true
        } else {
          toDelete.push(docSnap.id)
        }
      } else {
        // Delete responses from any other org
        toDelete.push(docSnap.id)
      }
    })

    // Calculate new date values
    const now = new Date()
    const newCompletedAt = now.toISOString()
    
    // Calculate week info
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    const weekNumber = Math.ceil(
      ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
    )
    const weekOf = `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
    const weekDate = weekStart.toISOString().split('T')[0]

    // Summary
    const summary = {
      totalResponses: snapshot.size,
      toKeepCount: toKeep.length,
      toDeleteCount: toDelete.length,
      robLevineCount: toKeep.filter(r => r.orgId === ROB_LEVINE_ORG_ID).length,
      envoyCount: toKeep.filter(r => r.orgId === ENVOY_ORG_ID).length,
      newDate: newCompletedAt.split('T')[0],
      weekOf,
      dryRun,
    }

    if (dryRun) {
      return NextResponse.json({
        message: "Dry run - no changes made",
        ...summary,
        toDeleteIds: toDelete,
        toKeepIds: toKeep.map(r => r.id),
      })
    }

    // Execute: Delete unwanted responses
    for (const responseId of toDelete) {
      await deleteDoc(doc(db, COLLECTIONS.RESPONSES, responseId))
    }

    // Execute: Update dates on kept responses
    for (const item of toKeep) {
      await updateDoc(doc(db, COLLECTIONS.RESPONSES, item.id), {
        completedAt: newCompletedAt,
        weekOf: weekOf,
        weekDate: weekDate,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${toDelete.length} responses, updated ${toKeep.length} to current date`,
      ...summary,
    })

  } catch (error) {
    console.error("Cleanup error:", error)
    return NextResponse.json(
      { error: "Failed to cleanup responses", details: String(error) },
      { status: 500 }
    )
  }
}

// GET endpoint to preview current state with org breakdown
export async function GET() {
  try {
    const responsesRef = collection(db, COLLECTIONS.RESPONSES)
    const snapshot = await getDocs(responsesRef)
    
    // Group by org and date
    const byOrg = new Map<string, { count: number; dates: Set<string> }>()
    
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data()
      const orgId = data.organizationId || "unknown"
      const completedAt = data.completedAt || ""
      const dateStr = completedAt ? completedAt.substring(0, 10) : "unknown"
      
      if (!byOrg.has(orgId)) {
        byOrg.set(orgId, { count: 0, dates: new Set() })
      }
      const entry = byOrg.get(orgId)!
      entry.count++
      entry.dates.add(dateStr)
    })

    // Convert to plain object
    const orgBreakdown: Record<string, { count: number; dates: string[] }> = {}
    for (const [orgId, data] of byOrg) {
      let label = orgId
      if (orgId === ROB_LEVINE_ORG_ID) label = `${orgId} (Rob Levine Law)`
      if (orgId === ENVOY_ORG_ID) label = `${orgId} (Envoy Design)`
      orgBreakdown[label] = {
        count: data.count,
        dates: Array.from(data.dates).sort(),
      }
    }

    return NextResponse.json({
      totalResponses: snapshot.size,
      byOrganization: orgBreakdown,
      planSummary: {
        willKeep: `All ${byOrg.get(ROB_LEVINE_ORG_ID)?.count || 0} from Rob Levine + 1 from Envoy`,
        willDelete: snapshot.size - (byOrg.get(ROB_LEVINE_ORG_ID)?.count || 0) - 1,
        willUpdateDates: "All kept responses updated to today's date",
      }
    })

  } catch (error) {
    console.error("Preview error:", error)
    return NextResponse.json(
      { error: "Failed to preview responses", details: String(error) },
      { status: 500 }
    )
  }
}
