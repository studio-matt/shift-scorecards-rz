import { NextResponse } from "next/server"
import {
  collection,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

const organizations = [
  {
    id: "org-1",
    name: "Acme Corp",
    departments: [
      "Engineering",
      "Sales",
      "Marketing",
      "Operations",
      "HR",
      "Product",
    ],
    website: "https://www.acmecorp.com",
    contactEmail: "admin@acmecorp.com",
    industry: "Technology",
    memberCount: 42,
  },
  {
    id: "org-2",
    name: "Globex Industries",
    departments: [
      "Engineering",
      "Sales",
      "Marketing",
      "Finance",
      "Legal",
      "Web",
      "Deliveries",
    ],
    website: "https://www.globex.com",
    contactEmail: "info@globex.com",
    industry: "Consulting",
    memberCount: 68,
  },
  {
    id: "org-3",
    name: "Initech LLC",
    departments: [
      "IT",
      "Operations",
      "HR",
      "Customer Success",
      "Executive",
      "Grounds",
      "Facilities",
    ],
    website: "https://www.initech.com",
    contactEmail: "support@initech.com",
    industry: "Finance",
    memberCount: 35,
  },
]

const templates = [
  {
    id: "tmpl-1",
    name: "AI Productivity Scorecard",
    description:
      "Weekly assessment of AI tool adoption and productivity impact",
    status: "active",
    questionCount: 14,
    questions: [
      {
        id: "q1",
        text: "How many hours did you save using AI tools this week?",
        type: "number",
      },
      {
        id: "q2",
        text: "How many AI-powered tools did you actively use this week?",
        type: "number",
      },
      {
        id: "q3",
        text: "How many tasks did you complete without AI assistance?",
        type: "number",
      },
      {
        id: "q4",
        text: "How many times did AI tools produce errors you had to correct?",
        type: "number",
      },
      {
        id: "q5",
        text: "How many new AI tools or features did you explore this week?",
        type: "number",
      },
      {
        id: "q6",
        text: "How many colleagues did you help with AI tool adoption?",
        type: "number",
      },
      {
        id: "q7",
        text: "Rate your overall AI productivity impact this week",
        type: "scale",
        min: 1,
        max: 10,
      },
      {
        id: "q8",
        text: "Rate the quality of AI-generated outputs this week",
        type: "scale",
        min: 1,
        max: 10,
      },
      {
        id: "q9",
        text: "Rate your confidence in using AI tools effectively",
        type: "scale",
        min: 1,
        max: 10,
      },
      {
        id: "q10",
        text: "Rate the time saved by AI in your daily workflow",
        type: "scale",
        min: 1,
        max: 10,
      },
      {
        id: "q11",
        text: "Rate the accuracy of AI suggestions and outputs",
        type: "scale",
        min: 1,
        max: 10,
      },
      {
        id: "q12",
        text: "Rate your willingness to adopt new AI tools",
        type: "scale",
        min: 1,
        max: 10,
      },
      {
        id: "q13",
        text: "Describe your biggest AI win this week",
        type: "text",
      },
      {
        id: "q14",
        text: "What AI capability would most improve your work next week?",
        type: "text",
      },
    ],
  },
  {
    id: "tmpl-2",
    name: "Team Wellness Check",
    description: "Weekly pulse check on team morale and collaboration",
    status: "draft",
    questionCount: 8,
    questions: [
      {
        id: "w1",
        text: "Rate your overall energy level this week",
        type: "scale",
        min: 1,
        max: 10,
      },
      {
        id: "w2",
        text: "Rate the quality of team collaboration",
        type: "scale",
        min: 1,
        max: 10,
      },
      {
        id: "w3",
        text: "Rate your work-life balance this week",
        type: "scale",
        min: 1,
        max: 10,
      },
      {
        id: "w4",
        text: "How supported do you feel by your manager?",
        type: "scale",
        min: 1,
        max: 10,
      },
      {
        id: "w5",
        text: "How many hours of deep focus work did you get?",
        type: "number",
      },
      {
        id: "w6",
        text: "How many unnecessary meetings did you attend?",
        type: "number",
      },
      {
        id: "w7",
        text: "What went well this week?",
        type: "text",
      },
      {
        id: "w8",
        text: "What could be improved?",
        type: "text",
      },
    ],
  },
]

export async function POST() {
  try {
    // Check if data already exists
    const orgsSnap = await getDocs(collection(db, "organizations"))
    if (!orgsSnap.empty) {
      return NextResponse.json({
        message: "Database already seeded",
        organizations: orgsSnap.size,
      })
    }

    // Seed organizations
    for (const org of organizations) {
      await setDoc(doc(db, "organizations", org.id), {
        ...org,
        createdAt: Timestamp.now(),
      })
    }

    // Seed templates
    for (const tmpl of templates) {
      await setDoc(doc(db, "templates", tmpl.id), {
        ...tmpl,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        organizationId: "org-1",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Seeded 3 organizations and 2 templates",
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("Seed error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
