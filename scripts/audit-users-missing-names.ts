/**
 * Audit script to find users with missing name data
 * Run with: npx tsx scripts/audit-users-missing-names.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY || "{}")
  initializeApp({
    credential: cert(serviceAccount),
  })
}

const db = getFirestore()

async function auditUsers() {
  console.log("Auditing users collection for missing names...\n")
  
  const usersSnapshot = await db.collection("users").get()
  const usersWithMissingNames: Array<{
    id: string
    email?: string
    firstName?: string
    lastName?: string
    organizationId?: string
  }> = []
  
  for (const doc of usersSnapshot.docs) {
    const data = doc.data()
    const firstName = data.firstName?.trim() || ""
    const lastName = data.lastName?.trim() || ""
    const fullName = `${firstName} ${lastName}`.trim()
    
    if (!fullName) {
      usersWithMissingNames.push({
        id: doc.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        organizationId: data.organizationId,
      })
    }
  }
  
  console.log(`Total users: ${usersSnapshot.size}`)
  console.log(`Users with missing names: ${usersWithMissingNames.length}\n`)
  
  if (usersWithMissingNames.length > 0) {
    console.log("Users missing names:")
    console.log("-------------------")
    for (const user of usersWithMissingNames) {
      console.log(`ID: ${user.id}`)
      console.log(`  Email: ${user.email || "(no email)"}`)
      console.log(`  FirstName: "${user.firstName || ""}"`)
      console.log(`  LastName: "${user.lastName || ""}"`)
      console.log(`  OrgId: ${user.organizationId || "(no org)"}`)
      console.log("")
    }
  }
  
  // Specifically check for the user ID from the screenshot
  const specificUserId = "ejD7Z4wd8gC33LtyJDcO"
  const specificUserDoc = await db.collection("users").doc(specificUserId).get()
  
  console.log("\n--- Specific User Check ---")
  console.log(`Checking user ID: ${specificUserId}`)
  if (specificUserDoc.exists) {
    const data = specificUserDoc.data()
    console.log("User exists with data:")
    console.log(JSON.stringify(data, null, 2))
  } else {
    console.log("User does NOT exist in users collection!")
    
    // Check if there are responses from this user
    const responsesSnapshot = await db.collection("responses")
      .where("userId", "==", specificUserId)
      .limit(5)
      .get()
    
    if (!responsesSnapshot.empty) {
      console.log(`\nFound ${responsesSnapshot.size} responses from this user:`)
      for (const doc of responsesSnapshot.docs) {
        const data = doc.data()
        console.log(`  - Response ID: ${doc.id}`)
        console.log(`    userName: ${data.userName}`)
        console.log(`    weekOf: ${data.weekOf}`)
        console.log(`    organizationId: ${data.organizationId}`)
      }
    }
  }
}

auditUsers()
  .then(() => {
    console.log("\nAudit complete.")
    process.exit(0)
  })
  .catch((err) => {
    console.error("Audit failed:", err)
    process.exit(1)
  })
