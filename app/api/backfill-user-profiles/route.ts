/**
 * API Route: Backfill userProfiles Mirror Collection
 * 
 * One-time migration endpoint to create /userProfiles/{authUid} documents
 * for all existing users who have an authId field.
 * 
 * PROTECTED ENDPOINT - Requires one of:
 * 1. Firebase Auth session with super admin role (role === "admin")
 * 2. X-Backfill-Secret header matching BACKFILL_SECRET env var
 * 
 * Usage: 
 *   POST /api/backfill-user-profiles
 *   Headers: X-Backfill-Secret: <your-secret>
 * 
 * ⚠️  DELETE OR DISABLE THIS ENDPOINT AFTER SUCCESSFUL RUN
 */

import { NextResponse } from "next/server"
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin"
import { cookies } from "next/headers"

// Verify the caller is a super admin
async function verifySuperAdmin(request: Request): Promise<{ authorized: boolean; reason?: string }> {
  // Option 1: Check X-Backfill-Secret header
  const secretHeader = request.headers.get("X-Backfill-Secret")
  const envSecret = process.env.BACKFILL_SECRET
  
  if (envSecret && secretHeader === envSecret) {
    console.log("[Backfill Auth] Authorized via BACKFILL_SECRET header")
    return { authorized: true }
  }
  
  // Option 2: Check Firebase Auth session
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("firebase-session")?.value
    
    if (!sessionCookie) {
      return { authorized: false, reason: "No session cookie found" }
    }
    
    // Verify the session cookie and get the user's UID
    const auth = getAdminAuth()
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true)
    const authUid = decodedToken.uid
    
    if (!authUid) {
      return { authorized: false, reason: "Invalid session - no UID" }
    }
    
    const db = getAdminDb()
    
    // First try: Check /userProfiles/{authUid} (preferred, keyed by auth UID)
    const profileDoc = await db.collection("userProfiles").doc(authUid).get()
    if (profileDoc.exists) {
      const profileData = profileDoc.data()
      if (profileData?.role === "admin") {
        console.log(`[Backfill Auth] Authorized via userProfiles - user ${authUid}`)
        return { authorized: true }
      }
      return { authorized: false, reason: `userProfiles role is "${profileData?.role}", not "admin"` }
    }
    
    // Fallback: Check /users where authId == authUid (for bootstrap before userProfiles exists)
    const usersQuery = await db.collection("users").where("authId", "==", authUid).limit(1).get()
    if (!usersQuery.empty) {
      const userData = usersQuery.docs[0].data()
      if (userData?.role === "admin") {
        console.log(`[Backfill Auth] Authorized via users collection fallback - user ${authUid}`)
        return { authorized: true }
      }
      return { authorized: false, reason: `users role is "${userData?.role}", not "admin"` }
    }
    
    return { authorized: false, reason: "User not found in userProfiles or users collection" }
  } catch (err) {
    console.error("[Backfill Auth] Error verifying session:", err)
    return { authorized: false, reason: `Auth error: ${err}` }
  }
}

export async function POST(request: Request) {
  // Verify authorization
  const authResult = await verifySuperAdmin(request)
  if (!authResult.authorized) {
    console.warn(`[Backfill] Unauthorized access attempt: ${authResult.reason}`)
    return NextResponse.json(
      { success: false, error: "Forbidden - Super admin access required", reason: authResult.reason },
      { status: 403 }
    )
  }
  
  try {
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
      message: "Backfill complete. ⚠️ DELETE OR DISABLE THIS ENDPOINT NOW.",
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

// Reject GET requests
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  )
}
