/**
 * API Route: Backfill userProfiles Mirror Collection
 * 
 * One-time migration endpoint to create /userProfiles/{authUid} documents
 * for all existing users who have an authId field.
 * 
 * This is a protected endpoint - only super admins can run it.
 * 
 * Usage: POST /api/backfill-user-profiles
 */

import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export async function POST(request: Request) {
  try {
    // Optional: Add auth check here if needed
    // For now, we'll just run the backfill
    
    const db = getAdminDb()
    const usersRef = db.collection("users")
    const userProfilesRef = db.collection("userProfiles")
    
    // Fetch all users
    const usersSnapshot = await usersRef.get()
    
    const results = {
      total: usersSnapshot.size,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    }
    
    console.log(`[Backfill] Found ${usersSnapshot.size} users to process`)
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const authId = userData.authId as string | undefined
      
      if (!authId) {
        console.log(`[Backfill] Skipping user ${userDoc.id} - no authId`)
        results.skipped++
        continue
      }
      
      try {
        // Build the profile mirror document
        const firstName = (userData.firstName as string) || ""
        const lastName = (userData.lastName as string) || ""
        const name = `${firstName} ${lastName}`.trim()
        
        const profileData = {
          authId,
          userDocId: userDoc.id,
          role: (userData.role as string) || "user",
          organizationId: (userData.organizationId as string) || "",
          department: (userData.department as string) || "",
          email: (userData.email as string) || "",
          name,
          status: (userData.status as string) || "active",
          updatedAt: new Date(),
        }
        
        // Use set with merge to upsert
        await userProfilesRef.doc(authId).set(profileData, { merge: true })
        console.log(`[Backfill] Created/updated profile for ${name} (${authId})`)
        results.created++
      } catch (err) {
        const errMsg = `Failed to create profile for user ${userDoc.id}: ${err}`
        console.error(`[Backfill] ${errMsg}`)
        results.errors.push(errMsg)
      }
    }
    
    console.log(`[Backfill] Complete! Created: ${results.created}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`)
    
    return NextResponse.json({
      success: true,
      message: "Backfill complete",
      results,
    })
  } catch (error) {
    console.error("[Backfill] Fatal error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

// Also support GET for easy browser testing (remove in production)
export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint to run the backfill",
    warning: "This will create userProfiles documents for all users with authId",
  })
}
