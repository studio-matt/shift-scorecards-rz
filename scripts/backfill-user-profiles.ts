/**
 * Backfill script: Create /userProfiles/{authUid} mirror documents for all existing users.
 * 
 * This script reads all documents from /users and creates corresponding
 * /userProfiles/{authId} documents with the minimal fields needed for
 * Firestore Security Rules.
 * 
 * Run with: npx tsx scripts/backfill-user-profiles.ts
 * 
 * Prerequisites:
 * - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars set
 * - Or run from a machine with Firebase Admin SDK credentials
 */

import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.")
    process.exit(1)
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

const db = getFirestore()

interface UserDoc {
  id: string
  authId?: string
  email?: string
  firstName?: string
  lastName?: string
  role?: string
  organizationId?: string
  department?: string
  status?: string
}

interface UserProfileMirror {
  authId: string
  userDocId: string
  role: string
  organizationId: string
  department: string
  email: string
  name: string
  status: string
  updatedAt: FieldValue
}

async function backfillUserProfiles() {
  console.log("Starting userProfiles backfill...")
  
  // Fetch all users
  const usersSnapshot = await db.collection("users").get()
  console.log(`Found ${usersSnapshot.size} user documents`)
  
  let created = 0
  let skipped = 0
  let errors = 0
  const usersWithoutAuthId: string[] = []
  
  for (const userDoc of usersSnapshot.docs) {
    const data = userDoc.data() as Omit<UserDoc, "id">
    const userId = userDoc.id
    
    // Skip users without authId - they haven't logged in yet
    if (!data.authId) {
      usersWithoutAuthId.push(userId)
      skipped++
      continue
    }
    
    const authId = data.authId
    const name = `${data.firstName || ""} ${data.lastName || ""}`.trim()
    
    const profileData: UserProfileMirror = {
      authId,
      userDocId: userId,
      role: data.role || "user",
      organizationId: data.organizationId || "",
      department: data.department || "",
      email: data.email || "",
      name,
      status: data.status || "active",
      updatedAt: FieldValue.serverTimestamp(),
    }
    
    try {
      // Check if profile already exists
      const existingProfile = await db.collection("userProfiles").doc(authId).get()
      
      if (existingProfile.exists) {
        // Update existing profile
        await db.collection("userProfiles").doc(authId).set(profileData, { merge: true })
        console.log(`Updated: ${authId} (${name || data.email})`)
      } else {
        // Create new profile
        await db.collection("userProfiles").doc(authId).set(profileData)
        console.log(`Created: ${authId} (${name || data.email})`)
      }
      created++
    } catch (err) {
      console.error(`Error processing ${userId}:`, err)
      errors++
    }
  }
  
  console.log("\n=== Backfill Complete ===")
  console.log(`Created/Updated: ${created}`)
  console.log(`Skipped (no authId): ${skipped}`)
  console.log(`Errors: ${errors}`)
  
  if (usersWithoutAuthId.length > 0) {
    console.log(`\nUsers without authId (haven't logged in):`)
    usersWithoutAuthId.slice(0, 20).forEach((id) => console.log(`  - ${id}`))
    if (usersWithoutAuthId.length > 20) {
      console.log(`  ... and ${usersWithoutAuthId.length - 20} more`)
    }
  }
}

// Run the backfill
backfillUserProfiles()
  .then(() => {
    console.log("\nBackfill completed successfully!")
    process.exit(0)
  })
  .catch((err) => {
    console.error("\nBackfill failed:", err)
    process.exit(1)
  })
