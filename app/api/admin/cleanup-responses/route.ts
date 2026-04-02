import { NextResponse } from "next/server"
import { collection, getDocs, deleteDoc, doc, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { COLLECTIONS } from "@/lib/firestore"

/**
 * Cleanup API - Deletes all responses EXCEPT the most recent CSV upload batch.
 * 
 * The most recent batch is identified by:
 * 1. Finding the most recent completedAt timestamp
 * 2. Keeping all responses with that same date (likely from same CSV import)
 * 
 * POST /api/admin/cleanup-responses
 * Query params:
 *   - dryRun=true : Preview what would be deleted without actually deleting
 *   - keepDate=YYYY-MM-DD : Keep responses from this specific date
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get("dryRun") === "true"
    const keepDateParam = searchParams.get("keepDate")

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

    // Group responses by date (YYYY-MM-DD)
    const responsesByDate = new Map<string, { id: string; completedAt: string }[]>()
    
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data()
      const completedAt = data.completedAt || data.createdAt || ""
      const dateStr = completedAt ? completedAt.substring(0, 10) : "unknown"
      
      if (!responsesByDate.has(dateStr)) {
        responsesByDate.set(dateStr, [])
      }
      responsesByDate.get(dateStr)!.push({
        id: docSnap.id,
        completedAt,
      })
    })

    // Find the most recent date (or use keepDate param)
    const sortedDates = Array.from(responsesByDate.keys())
      .filter(d => d !== "unknown")
      .sort((a, b) => b.localeCompare(a)) // Descending
    
    const mostRecentDate = keepDateParam || sortedDates[0]
    
    if (!mostRecentDate) {
      return NextResponse.json({ 
        error: "Could not determine most recent date",
        dates: sortedDates,
      }, { status: 400 })
    }

    // Identify which responses to keep and delete
    const toKeep: string[] = []
    const toDelete: string[] = []
    
    for (const [dateStr, responses] of responsesByDate.entries()) {
      for (const r of responses) {
        if (dateStr === mostRecentDate) {
          toKeep.push(r.id)
        } else {
          toDelete.push(r.id)
        }
      }
    }

    // Summary of what we found
    const summary = {
      totalResponses: snapshot.size,
      datesFound: sortedDates,
      keepingDate: mostRecentDate,
      toKeepCount: toKeep.length,
      toDeleteCount: toDelete.length,
      dryRun,
    }

    // If dry run, just return the summary
    if (dryRun) {
      return NextResponse.json({
        message: "Dry run - no changes made",
        ...summary,
        toDeleteIds: toDelete.slice(0, 10), // Show first 10 for preview
      })
    }

    // Actually delete the old responses
    let deletedCount = 0
    for (const responseId of toDelete) {
      await deleteDoc(doc(db, COLLECTIONS.RESPONSES, responseId))
      deletedCount++
    }

    return NextResponse.json({
      message: `Successfully deleted ${deletedCount} old responses`,
      ...summary,
      actuallyDeleted: deletedCount,
    })

  } catch (error) {
    console.error("Cleanup error:", error)
    return NextResponse.json(
      { error: "Failed to cleanup responses", details: String(error) },
      { status: 500 }
    )
  }
}

// GET endpoint to preview current state
export async function GET() {
  try {
    const responsesRef = collection(db, COLLECTIONS.RESPONSES)
    const snapshot = await getDocs(responsesRef)
    
    // Group by date
    const responsesByDate = new Map<string, number>()
    
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data()
      const completedAt = data.completedAt || data.createdAt || ""
      const dateStr = completedAt ? completedAt.substring(0, 10) : "unknown"
      
      responsesByDate.set(dateStr, (responsesByDate.get(dateStr) || 0) + 1)
    })

    const sortedDates = Array.from(responsesByDate.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))

    return NextResponse.json({
      totalResponses: snapshot.size,
      responsesByDate: Object.fromEntries(sortedDates),
      mostRecentDate: sortedDates[0]?.[0] || null,
    })

  } catch (error) {
    console.error("Preview error:", error)
    return NextResponse.json(
      { error: "Failed to preview responses", details: String(error) },
      { status: 500 }
    )
  }
}
