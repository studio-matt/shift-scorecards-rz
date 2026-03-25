/**
 * Seed script to create test scorecard responses for all users
 * 
 * This script:
 * 1. Fetches all users from the 'users' collection
 * 2. Fetches the existing template from the 'templates' collection
 * 3. Fetches the active release from the 'schedules' collection
 * 4. Creates a test response for each user in the 'responses' collection
 */

import { initializeApp } from "firebase/app"
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyD_FPvDabLJFkD_fecfKQJw8YFptLEIxgQ",
  authDomain: "shift-fe6e9.firebaseapp.com",
  projectId: "shift-fe6e9",
  storageBucket: "shift-fe6e9.appspot.com",
  messagingSenderId: "160061885682",
  appId: "1:160061885682:web:d01a65e90002974936146b",
  measurementId: "G-8SE0NCEGE9",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Helper to get current week label
function getWeekOfLabel() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  return monday.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

// Generate random answer for a question based on its type
function generateAnswer(question) {
  switch (question.type) {
    case "scale":
    case "confidence":
      // Random value between min and max (or 1-10 for confidence)
      const min = question.scaleMin ?? 1
      const max = question.scaleMax ?? 10
      return Math.floor(Math.random() * (max - min + 1)) + min
    case "number":
      // Random hours saved (0-20)
      return Math.floor(Math.random() * 21)
    case "text":
      // Random text response
      const textResponses = [
        "Used AI to automate report generation, saved significant time.",
        "Leveraged ChatGPT for email drafts and meeting summaries.",
        "Built automated workflows for data entry tasks.",
        "Created templates using AI that now save hours each week.",
        "Used AI coding assistants to speed up development work.",
        "Automated scheduling and calendar management with AI tools.",
        "Generated documentation and specs using AI writing tools.",
        "Used AI for research synthesis and market analysis.",
        "Implemented AI chatbot for customer support queries.",
        "Automated data cleanup and formatting with AI scripts.",
      ]
      return textResponses[Math.floor(Math.random() * textResponses.length)]
    case "multichoice":
      // Random option from available options
      if (question.options && question.options.length > 0) {
        const randomOption = question.options[Math.floor(Math.random() * question.options.length)]
        return randomOption.label
      }
      return "A"
    default:
      return 5
  }
}

async function main() {
  console.log("Starting seed script for test responses...\n")

  // 1. Fetch all users
  console.log("Fetching users...")
  const usersSnapshot = await getDocs(collection(db, "users"))
  const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  console.log(`Found ${users.length} users\n`)

  if (users.length === 0) {
    console.log("No users found. Exiting.")
    process.exit(0)
  }

  // 2. Fetch templates
  console.log("Fetching templates...")
  const templatesSnapshot = await getDocs(collection(db, "templates"))
  const templates = templatesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  console.log(`Found ${templates.length} template(s)\n`)

  if (templates.length === 0) {
    console.log("No templates found. Exiting.")
    process.exit(0)
  }

  // Use the first template (the only one that exists)
  const template = templates[0]
  console.log(`Using template: "${template.name}" (${template.id})`)
  console.log(`Template has ${template.questions?.length || 0} questions\n`)

  // 3. Fetch releases (schedules) to find active one
  console.log("Fetching releases...")
  const releasesSnapshot = await getDocs(collection(db, "schedules"))
  const releases = releasesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  console.log(`Found ${releases.length} release(s)\n`)

  // Find active release or use the first one
  let release = releases.find((r) => r.status === "active")
  if (!release && releases.length > 0) {
    release = releases[0]
    console.log(`No active release found, using first release: ${release.id}`)
  }

  if (!release) {
    console.log("No releases found. Will create responses without releaseId.")
  } else {
    console.log(`Using release: ${release.id} (status: ${release.status})\n`)
  }

  // 4. Check for existing responses to avoid duplicates
  console.log("Checking for existing responses...")
  const existingResponsesSnapshot = await getDocs(collection(db, "responses"))
  const existingResponses = existingResponsesSnapshot.docs.map((doc) => doc.data())
  const existingUserIds = new Set(existingResponses.map((r) => r.userId))
  console.log(`Found ${existingResponses.length} existing responses\n`)

  // 5. Create responses for each user who hasn't responded yet
  const weekOf = getWeekOfLabel()
  console.log(`Creating responses for week of: ${weekOf}\n`)

  let created = 0
  let skipped = 0

  for (const user of users) {
    // Check if user already has a response for this template
    const hasResponse = existingResponses.some(
      (r) => r.userId === user.id && r.templateId === template.id
    )

    if (hasResponse) {
      console.log(`Skipping ${user.firstName} ${user.lastName} (${user.email}) - already has response`)
      skipped++
      continue
    }

    // Generate answers for all questions
    const answers = {}
    for (const question of template.questions || []) {
      answers[question.id] = generateAnswer(question)
    }

    // Create the response document
    const responseData = {
      templateId: template.id,
      releaseId: release?.id || null,
      userId: user.id,
      userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      organizationId: user.organizationId || release?.organizationId || null,
      department: user.department || "Unknown",
      answers,
      completedAt: new Date().toISOString(),
      weekOf,
      weekDate: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    try {
      const docRef = await addDoc(collection(db, "responses"), responseData)
      console.log(`Created response for ${user.firstName} ${user.lastName} (${user.email}) - ID: ${docRef.id}`)
      created++
    } catch (error) {
      console.error(`Failed to create response for ${user.email}:`, error.message)
    }
  }

  console.log("\n" + "=".repeat(50))
  console.log(`Done! Created ${created} responses, skipped ${skipped} existing.`)
  console.log("=".repeat(50))

  process.exit(0)
}

main().catch((error) => {
  console.error("Script failed:", error)
  process.exit(1)
})
