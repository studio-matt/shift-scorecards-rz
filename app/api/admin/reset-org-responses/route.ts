import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore"

/**
 * Reset Organization Responses API
 * 
 * Deletes ALL responses for a specific organization while keeping users intact.
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
 *   confirm=true - Required for POST to actually delete
 */

const ROB_LEVINE_ORG_ID = "n1pjEpYGFxOqdsByYE0w"

// Verify authorization via secret header
function verifyAuth(request: Request): { authorized: boolean; reason?: string } {
  const secretHeader = request.headers.get("X-Backfill-Secret")
  const envSecret = process.env.BACKFILL_SECRET
  
  if (!envSecret) {
    return { authorized: false, reason: "BACKFILL_SECRET env var not configured on server" }
  }
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
  
  if (!orgId) {
    return NextResponse.json({ 
      error: "Missing orgId parameter",
      hint: `Use ?orgId=${ROB_LEVINE_ORG_ID} for Rob Levine Law`
    }, { status: 400 })
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
    
    for (const docSnap of responsesSnapshot.docs) {
      const data = docSnap.data()
      const responseOrgId = data.organizationId || ""
      const userId = data.userId || ""
      const userOrgId = userOrgMap.get(userId) || ""
      
      // Match if either the response's orgId OR the user's orgId matches
      if (responseOrgId === orgId || userOrgId === orgId) {
        responsesToDelete.push({
          id: docSnap.id,
          userId,
          weekOf: data.weekOf || "",
          completedAt: data.completedAt || "",
        })
      }
    }

    // Count users in this org
    const usersInOrg = Array.from(userOrgMap.entries()).filter(([_, uOrgId]) => uOrgId === orgId).length

    return NextResponse.json({
      dryRun: true,
      organization: orgName,
      organizationId: orgId,
      responsesToDelete: responsesToDelete.length,
      usersInOrg,
      usersWillBeKept: true,
      responses: responsesToDelete.slice(0, 20), // Show first 20 for preview
      message: responsesToDelete.length > 20 
        ? `Showing first 20 of ${responsesToDelete.length} responses. POST with ?confirm=true to delete all.`
        : `Found ${responsesToDelete.length} responses. POST with ?confirm=true to delete.`,
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
    const errors: string[] = []
    
    for (const docSnap of responsesSnapshot.docs) {
      const data = docSnap.data()
      const responseOrgId = data.organizationId || ""
      const userId = data.userId || ""
      const userOrgId = userOrgMap.get(userId) || ""
      
      // Match if either the response's orgId OR the user's orgId matches
      if (responseOrgId === orgId || userOrgId === orgId) {
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
      responsesDeleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully deleted ${deletedCount} responses for ${orgName}. Users are preserved.`,
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
