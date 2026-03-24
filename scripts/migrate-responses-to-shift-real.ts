/**
 * Migration: Update all responses to point to "SHIFT REAL SCORECARD" template
 * 
 * This script:
 * 1. Finds the template ID for "SHIFT REAL SCORECARD"
 * 2. Updates all existing responses to use that template ID
 */

import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}")
  initializeApp({
    credential: cert(serviceAccount),
  })
}

const db = getFirestore()

async function migrateResponses() {
  console.log("Starting migration: Update all responses to SHIFT REAL SCORECARD...")

  // 1. Find the SHIFT REAL SCORECARD template
  const templatesSnapshot = await db.collection("templates").where("name", "==", "SHIFT REAL SCORECARD").get()
  
  if (templatesSnapshot.empty) {
    console.error("ERROR: Could not find template named 'SHIFT REAL SCORECARD'")
    console.log("Available templates:")
    const allTemplates = await db.collection("templates").get()
    allTemplates.docs.forEach(doc => {
      console.log(`  - ${doc.data().name} (ID: ${doc.id})`)
    })
    process.exit(1)
  }

  const shiftRealTemplate = templatesSnapshot.docs[0]
  const templateId = shiftRealTemplate.id
  const templateName = shiftRealTemplate.data().name

  console.log(`Found template: "${templateName}" with ID: ${templateId}`)

  // 2. Get all responses
  const responsesSnapshot = await db.collection("responses").get()
  console.log(`Found ${responsesSnapshot.size} total responses`)

  // 3. Update each response
  const batch = db.batch()
  let updateCount = 0

  for (const doc of responsesSnapshot.docs) {
    const currentTemplateId = doc.data().templateId
    if (currentTemplateId !== templateId) {
      batch.update(doc.ref, { templateId })
      updateCount++
    }
  }

  if (updateCount === 0) {
    console.log("All responses already point to SHIFT REAL SCORECARD. No updates needed.")
    return
  }

  // Commit the batch
  await batch.commit()
  console.log(`Successfully updated ${updateCount} responses to use template ID: ${templateId}`)
}

migrateResponses()
  .then(() => {
    console.log("Migration complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Migration failed:", error)
    process.exit(1)
  })
