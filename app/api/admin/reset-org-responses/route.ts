import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore"

/**
 * Reset Organization Responses API
 * 
 * Deletes responses for a specific organization while keeping users intact.
 * Use this to start fresh with a new scorecard campaign.
 * 
 * SECURITY: Requires BACKFILL_SECRET header (same as backfill endpoint)
 * 
 * Usage:
 *   GET  - Preview what would be deleted (dry run)
 *   POST - Actually delete the responses
 * 
 * Query params:
 *   orgId - The organization ID to reset (required)
 *   before - ISO date string, only delete responses BEFORE this date (optional)
 *            Example: ?before=2026-04-28 deletes everything before April 28, 2026
 *   confirm=true - Required for POST to actually delete
 */

const ROB_LEVINE_ORG_ID = "n1pjEpYGFxOqdsByYE0w"

// TEMPORARY hardcoded fallback - delete this file after use!
const TEMP_FALLBACK_SECRET = "shift-backfill-2026"

// Verify authorization via secret header
function verifyAuth(request: Request): { authorized: boolean; reason?: string } {
  const secretHeader = request.headers.get("X-Backfill-Secret")
  const envSecret = process.env.BACKFILL_SECRET || TEMP_FALLBACK_SECRET
  
  if (!secretHeader) {
    return { authorized: false, reason: "Missing X-Backfill-Secret header" }
  }
  if (secretHeader !== envSecret) {
    return { authorized: false, reason: "Secret does not match" }
  }
  return { authorized: true }
}

export async function GET(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 403 })
  }

  const orgId = request.nextUrl.searchParams.get("orgId")
  const beforeParam = request.nextUrl.searchParams.get("before")
  
  if (!orgId) {
    return NextResponse.json({ 
      error: "Missing orgId parameter",
      hint: `Use ?orgId=${ROB_LEVINE_ORG_ID} for Rob Levine Law`,
      example: `?orgId=${ROB_LEVINE_ORG_ID}&before=2026-04-28`
    }, { status: 400 })
  }

  // Parse before date if provided
  let beforeDate: Date | null = null
  if (beforeParam) {
    beforeDate = new Date(beforeParam)
    if (isNaN(beforeDate.getTime())) {
      return NextResponse.json({ 
        error: "Invalid before date",
        hint: "Use ISO format like ?before=2026-04-28"
      }, { status: 400 })
    }
    // Set to start of day
    beforeDate.setHours(0, 0, 0, 0)
  }

  try {
    // Get organization name
    const orgsSnapshot = await getDocs(collection(db, "organizations"))
    let orgName = "Unknown"
    for (const orgDoc of orgsSnapshot.docs) {
      if (orgDoc.id === orgId) {
        orgName = orgDoc.data().name || "Unknown"
        break
      }
    }

    // Count responses for this org
    // Check both by organizationId on response AND by user's org
    const responsesSnapshot = await getDocs(collection(db, "responses"))
    const usersSnapshot = await getDocs(collection(db, "users"))
    
    // Build map of userId -> orgId from user profiles
    const userOrgMap = new Map<string, string>()
    for (const userDoc of usersSnapshot.docs) {
      const data = userDoc.data()
      if (data.organizationId) {
        userOrgMap.set(userDoc.id, data.organizationId)
      }
    }

    // Find responses that belong to this org (by response.organizationId OR by user's org)
    const responsesToDelete: Array<{ id: string; userId: string; weekOf: string; completedAt: string }> = []
    let skippedAfterDate = 0
    
    for (const docSnap of responsesSnapshot.docs) {
      const data = docSnap.data()
      const responseOrgId = data.organizationId || ""
      const userId = data.userId || ""
      const userOrgId = userOrgMap.get(userId) || ""
      const completedAt = data.completedAt || ""
      
      // Match if either the response's orgId OR the user's orgId matches
      if (responseOrgId === orgId || userOrgId === orgId) {
        // If before date is specified, only include responses before that date
        if (beforeDate && completedAt) {
          const responseDate = new Date(completedAt)
          if (responseDate >= beforeDate) {
            skippedAfterDate++
            continue // Skip this response - it's after the cutoff
          }
        }
        
        responsesToDelete.push({
          id: docSnap.id,
          userId,
          weekOf: data.weekOf || "",
          completedAt,
        })
      }
    }

    // Count users in this org
    const usersInOrg = Array.from(userOrgMap.entries()).filter(([_, uOrgId]) => uOrgId === orgId).length

    return NextResponse.json({
      dryRun: true,
      organization: orgName,
      organizationId: orgId,
      beforeDate: beforeDate ? beforeDate.toISOString() : null,
      responsesToDelete: responsesToDelete.length,
      responsesKept: skippedAfterDate,
      usersInOrg,
      usersWillBeKept: true,
      responses: responsesToDelete.slice(0, 20), // Show first 20 for preview
      message: beforeDate 
        ? `Found ${responsesToDelete.length} responses BEFORE ${beforeParam}. ${skippedAfterDate} responses after that date will be KEPT. POST with ?confirm=true to delete.`
        : `Found ${responsesToDelete.length} responses. POST with ?confirm=true to delete all.`,
    })
  } catch (error) {
    console.error("Error in reset preview:", error)
    return NextResponse.json({ error: "Failed to preview reset", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 403 })
  }

  const orgId = request.nextUrl.searchParams.get("orgId")
  const confirm = request.nextUrl.searchParams.get("confirm")
  const beforeParam = request.nextUrl.searchParams.get("before")
  
  if (!orgId) {
    return NextResponse.json({ 
      error: "Missing orgId parameter",
      hint: `Use ?orgId=${ROB_LEVINE_ORG_ID} for Rob Levine Law`
    }, { status: 400 })
  }

  if (confirm !== "true") {
    return NextResponse.json({ 
      error: "Missing confirmation",
      hint: "Add ?confirm=true to actually delete responses. Use GET first to preview."
    }, { status: 400 })
  }

  // Parse before date if provided
  let beforeDate: Date | null = null
  if (beforeParam) {
    beforeDate = new Date(beforeParam)
    if (isNaN(beforeDate.getTime())) {
      return NextResponse.json({ 
        error: "Invalid before date",
        hint: "Use ISO format like ?before=2026-04-28"
      }, { status: 400 })
    }
    // Set to start of day
    beforeDate.setHours(0, 0, 0, 0)
  }

  try {
    // Get organization name
    const orgsSnapshot = await getDocs(collection(db, "organizations"))
    let orgName = "Unknown"
    for (const orgDoc of orgsSnapshot.docs) {
      if (orgDoc.id === orgId) {
        orgName = orgDoc.data().name || "Unknown"
        break
      }
    }

    // Get all responses and users
    const responsesSnapshot = await getDocs(collection(db, "responses"))
    const usersSnapshot = await getDocs(collection(db, "users"))
    
    // Build map of userId -> orgId from user profiles
    const userOrgMap = new Map<string, string>()
    for (const userDoc of usersSnapshot.docs) {
      const data = userDoc.data()
      if (data.organizationId) {
        userOrgMap.set(userDoc.id, data.organizationId)
      }
    }

    // Find and delete responses for this org
    let deletedCount = 0
    let skippedCount = 0
    const errors: string[] = []
    
    for (const docSnap of responsesSnapshot.docs) {
      const data = docSnap.data()
      const responseOrgId = data.organizationId || ""
      const userId = data.userId || ""
      const userOrgId = userOrgMap.get(userId) || ""
      const completedAt = data.completedAt || ""
      
      // Match if either the response's orgId OR the user's orgId matches
      if (responseOrgId === orgId || userOrgId === orgId) {
        // If before date is specified, only delete responses before that date
        if (beforeDate && completedAt) {
          const responseDate = new Date(completedAt)
          if (responseDate >= beforeDate) {
            skippedCount++
            continue // Skip - keep this response
          }
        }
        
        try {
          await deleteDoc(doc(db, "responses", docSnap.id))
          deletedCount++
        } catch (err) {
          errors.push(`Failed to delete ${docSnap.id}: ${String(err)}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      organization: orgName,
      organizationId: orgId,
      beforeDate: beforeDate ? beforeDate.toISOString() : null,
      responsesDeleted: deletedCount,
      responsesKept: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: beforeDate 
        ? `Deleted ${deletedCount} responses BEFORE ${beforeParam} for ${orgName}. Kept ${skippedCount} newer responses.`
        : `Deleted ${deletedCount} responses for ${orgName}. Users preserved.`,
      nextSteps: [
        "Users in this org can now submit fresh scorecards",
        "Send new invites or notify users to fill out scorecards",
        "Delete this endpoint after use: app/api/admin/reset-org-responses/route.ts"
      ]
    })
  } catch (error) {
    console.error("Error resetting org responses:", error)
    return NextResponse.json({ error: "Failed to reset responses", details: String(error) }, { status: 500 })
  }
}
