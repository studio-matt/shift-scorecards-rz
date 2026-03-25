import { NextResponse } from "next/server"
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User, ScorecardTemplate, ScorecardQuestion } from "@/lib/types"

// Helper to generate random scale value
function randomScale(min = 1, max = 10) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Helper to generate random text response
function randomTextResponse() {
  const responses = [
    "Used AI to automate data entry tasks, saving significant time on weekly reports.",
    "Implemented AI-powered code suggestions which reduced debugging time.",
    "Leveraged ChatGPT for drafting customer communications.",
    "Used AI tools for meeting summaries and action item extraction.",
    "Automated repetitive Excel formulas using AI assistance.",
    "AI helped with research and documentation tasks.",
    "Used Copilot for code generation on routine tasks.",
    "AI-assisted email drafting improved response quality.",
    "Implemented AI for data analysis and visualization.",
    "Used AI for brainstorming and ideation sessions.",
    "Automated scheduling tasks with AI integration.",
    "AI helped optimize workflow processes.",
    "Used machine learning for predictive analytics.",
    "Implemented AI chatbot for internal queries.",
    "AI-powered search improved document retrieval.",
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

// Helper to get the Monday of the current week
function getCurrentWeekOf() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split("T")[0]
}

// Generate answers based on template questions
function generateAnswers(questions: ScorecardQuestion[]) {
  const answers: Record<string, number | string> = {}

  for (const question of questions) {
    switch (question.type) {
      case "scale":
      case "confidence":
        const min = question.scaleMin ?? 1
        const max = question.scaleMax ?? 10
        answers[question.id] = randomScale(min, max)
        break

      case "number":
        answers[question.id] = randomScale(1, 40)
        break

      case "text":
        answers[question.id] = randomTextResponse()
        break

      case "multichoice":
        if (question.options && question.options.length > 0) {
          const randomIndex = Math.floor(Math.random() * question.options.length)
          answers[question.id] = question.options[randomIndex].value
        }
        break

      default:
        answers[question.id] = randomScale(1, 10)
    }
  }

  return answers
}

export async function POST() {
  try {
    // 1. Get all templates
    const templatesSnapshot = await getDocs(collection(db, "templates"))
    const templates = templatesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (ScorecardTemplate & { id: string })[]

    if (templates.length === 0) {
      return NextResponse.json(
        { error: "No templates found in the system" },
        { status: 400 }
      )
    }

    // Use the first template
    const template = templates[0]

    // 2. Get active release (if any)
    const schedulesSnapshot = await getDocs(collection(db, "schedules"))
    const schedules = schedulesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    const activeRelease = schedules.find(
      (s) => (s as { status?: string }).status === "active"
    )

    // 3. Get all users
    const usersSnapshot = await getDocs(collection(db, "users"))
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (User & { id: string })[]

    if (users.length === 0) {
      return NextResponse.json(
        { error: "No users found in the system" },
        { status: 400 }
      )
    }

    // 4. Get existing responses for this template to avoid duplicates
    const responsesQuery = query(
      collection(db, "responses"),
      where("templateId", "==", template.id)
    )
    const responsesSnapshot = await getDocs(responsesQuery)
    const usersWithResponses = new Set(
      responsesSnapshot.docs.map((doc) => doc.data().userId)
    )

    // 5. Create responses for users who don't have one
    const weekOf = getCurrentWeekOf()
    let created = 0
    let skipped = 0
    const createdUsers: string[] = []

    for (const user of users) {
      // Skip if user already has a response
      if (usersWithResponses.has(user.id)) {
        skipped++
        continue
      }

      // Generate random answers
      const answers = generateAnswers(template.questions || [])

      // Create response document
      const response = {
        templateId: template.id,
        releaseId: activeRelease?.id || null,
        userId: user.id,
        organizationId: user.organizationId,
        answers,
        completedAt: new Date().toISOString(),
        weekOf,
        createdAt: new Date().toISOString(),
      }

      await addDoc(collection(db, "responses"), response)
      createdUsers.push(`${user.firstName} ${user.lastName}`)
      created++
    }

    return NextResponse.json({
      success: true,
      message: `Created ${created} test response(s), skipped ${skipped} user(s) who already had responses`,
      template: template.name,
      weekOf,
      createdFor: createdUsers,
      skippedCount: skipped,
    })
  } catch (error) {
    console.error("Error seeding test responses:", error)
    return NextResponse.json(
      { error: "Failed to seed test responses", details: String(error) },
      { status: 500 }
    )
  }
}
