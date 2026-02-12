import { NextResponse } from "next/server"
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

// ── Fake employee data ────────────────────────────────────────────────
const fakeEmployees: Record<string, { firstName: string; lastName: string; department: string }[]> = {
  "org-acme": [
    { firstName: "Sarah", lastName: "Chen", department: "Engineering" },
    { firstName: "Marcus", lastName: "Williams", department: "Engineering" },
    { firstName: "Priya", lastName: "Patel", department: "Product" },
    { firstName: "James", lastName: "O'Brien", department: "Sales" },
    { firstName: "Elena", lastName: "Rodriguez", department: "Marketing" },
  ],
  "org-envoy": [
    { firstName: "Alex", lastName: "Kim", department: "Design" },
    { firstName: "Jordan", lastName: "Taylor", department: "Design" },
    { firstName: "Maya", lastName: "Singh", department: "Engineering" },
    { firstName: "Liam", lastName: "Foster", department: "Operations" },
    { firstName: "Olivia", lastName: "Nakamura", department: "Marketing" },
  ],
  "org-initech": [
    { firstName: "David", lastName: "Thompson", department: "IT" },
    { firstName: "Rachel", lastName: "Greene", department: "IT" },
    { firstName: "Carlos", lastName: "Martinez", department: "Customer Success" },
    { firstName: "Amara", lastName: "Johnson", department: "Operations" },
    { firstName: "Ethan", lastName: "Burke", department: "HR" },
  ],
}

// ── Organizations ─────────────────────────────────────────────────────
const organizations = [
  {
    id: "org-acme",
    name: "Acme Corp",
    departments: ["Engineering", "Sales", "Marketing", "Operations", "HR", "Product"],
    website: "https://www.acmecorp.com",
    contactEmail: "admin@acmecorp.com",
    industry: "Technology",
    memberCount: 42,
  },
  {
    id: "org-envoy",
    name: "Envoy Design",
    departments: ["Design", "Engineering", "Marketing", "Operations", "Executive"],
    website: "https://www.envoydesign.co",
    contactEmail: "hello@envoydesign.co",
    industry: "Design",
    memberCount: 28,
  },
  {
    id: "org-initech",
    name: "Initech LLC",
    departments: ["IT", "Operations", "HR", "Customer Success", "Executive"],
    website: "https://www.initech.com",
    contactEmail: "support@initech.com",
    industry: "Finance",
    memberCount: 35,
  },
]

// ── Templates (3 workplace + AI themed) ──────────────────────────────
const templates = [
  {
    id: "tmpl-ai-prod",
    name: "AI Productivity Scorecard",
    description: "Weekly assessment of AI tool adoption and productivity impact",
    status: "active",
    questionCount: 7,
    questions: [
      { id: "q1", text: "Rate your overall AI productivity impact this week", type: "scale", min: 1, max: 10, order: 1 },
      { id: "q2", text: "How confident are you using AI tools effectively?", type: "scale", min: 1, max: 10, order: 2 },
      { id: "q3", text: "Rate the quality of AI-generated outputs this week", type: "scale", min: 1, max: 10, order: 3 },
      { id: "q4", text: "How many hours did AI tools save you this week?", type: "number", order: 4 },
      { id: "q5", text: "How many AI tools did you actively use this week?", type: "number", order: 5 },
      { id: "q6", text: "Rate your willingness to adopt new AI tools", type: "scale", min: 1, max: 10, order: 6 },
      { id: "q7", text: "Describe your biggest AI win this week", type: "text", order: 7 },
    ],
  },
  {
    id: "tmpl-team-collab",
    name: "Team Collaboration Check",
    description: "Weekly pulse on team dynamics and cross-functional work",
    status: "active",
    questionCount: 7,
    questions: [
      { id: "c1", text: "Rate the quality of team collaboration this week", type: "scale", min: 1, max: 10, order: 1 },
      { id: "c2", text: "How well did cross-team handoffs work?", type: "scale", min: 1, max: 10, order: 2 },
      { id: "c3", text: "Rate communication clarity with your manager", type: "scale", min: 1, max: 10, order: 3 },
      { id: "c4", text: "How many productive meetings did you attend?", type: "number", order: 4 },
      { id: "c5", text: "How many unnecessary meetings did you attend?", type: "number", order: 5 },
      { id: "c6", text: "Rate your ability to get deep focus work done", type: "scale", min: 1, max: 10, order: 6 },
      { id: "c7", text: "What improved team dynamics the most this week?", type: "text", order: 7 },
    ],
  },
  {
    id: "tmpl-innovation",
    name: "Innovation & Growth Pulse",
    description: "Monthly check on creative output and professional development",
    status: "active",
    questionCount: 7,
    questions: [
      { id: "i1", text: "Rate your creative output this period", type: "scale", min: 1, max: 10, order: 1 },
      { id: "i2", text: "How supported do you feel in trying new approaches?", type: "scale", min: 1, max: 10, order: 2 },
      { id: "i3", text: "Rate your professional growth this month", type: "scale", min: 1, max: 10, order: 3 },
      { id: "i4", text: "How many new skills or tools did you explore?", type: "number", order: 4 },
      { id: "i5", text: "How many ideas did you contribute in brainstorms?", type: "number", order: 5 },
      { id: "i6", text: "Rate the organization's openness to innovation", type: "scale", min: 1, max: 10, order: 6 },
      { id: "i7", text: "What is one innovation you would champion next month?", type: "text", order: 7 },
    ],
  },
]

// ── Helper: generate varied responses ─────────────────────────────────
function generateAnswers(
  questions: typeof templates[0]["questions"],
  employeeIdx: number,
  weekOffset: number,
): Record<string, number | string> {
  const answers: Record<string, number | string> = {}
  const baseQuality = 5 + (employeeIdx % 3) // 5, 6, 7 base
  const weekBoost = weekOffset * 0.3 // slight improvement over time

  const textResponses = [
    "Used Copilot to refactor our auth module - saved 3 hours",
    "ChatGPT helped draft the project proposal, client loved it",
    "Automated weekly reporting with AI scripts",
    "Used AI to generate test data for QA, huge time saver",
    "Built a custom prompt template for code reviews",
    "AI-assisted customer segmentation analysis was spot on",
    "Pair-programmed with Claude on a complex migration",
    "Used Midjourney for rapid prototyping of UI concepts",
    "AI transcription saved 2 hours of meeting note taking",
    "Created an AI workflow for ticket triage",
    "The standup format change really improved focus",
    "Cross-team design review sessions are paying off",
    "Mentoring new hire on AI tools, both learning a lot",
    "Async communication experiment is working well",
    "The new brainstorm framework generated 12 viable ideas",
  ]

  for (const q of questions) {
    if (q.type === "scale") {
      const raw = baseQuality + weekBoost + (Math.random() * 2 - 0.5)
      answers[q.id] = Math.min(10, Math.max(1, Math.round(raw * 10) / 10))
    } else if (q.type === "number") {
      if (q.text.toLowerCase().includes("hours") || q.text.toLowerCase().includes("save")) {
        answers[q.id] = Math.floor(2 + employeeIdx + weekOffset * 0.5 + Math.random() * 3)
      } else if (q.text.toLowerCase().includes("unnecessary")) {
        answers[q.id] = Math.max(0, Math.floor(4 - weekOffset * 0.5 - Math.random() * 2))
      } else {
        answers[q.id] = Math.floor(1 + Math.random() * 5 + weekOffset * 0.3)
      }
    } else if (q.type === "text") {
      const idx = (employeeIdx * 3 + weekOffset) % textResponses.length
      answers[q.id] = textResponses[idx]
    }
  }
  return answers
}

// ── Helper: date helpers ──────────────────────────────────────────────
function weeksAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n * 7)
  return d
}

function weekLabel(weeksBack: number): string {
  const d = weeksAgo(weeksBack)
  return `W${String(getWeekNumber(d)).padStart(2, "0")}`
}

function getWeekNumber(d: Date): number {
  const oneJan = new Date(d.getFullYear(), 0, 1)
  const days = Math.floor((d.getTime() - oneJan.getTime()) / 86400000)
  return Math.ceil((days + oneJan.getDay() + 1) / 7)
}

// ── Main seed endpoint ────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const force = url.searchParams.get("force") === "true"

    // Optionally wipe existing data
    if (force) {
      const colls = ["organizations", "templates", "users", "responses", "schedules"]
      for (const c of colls) {
        const snap = await getDocs(collection(db, c))
        for (const d of snap.docs) {
          await deleteDoc(doc(db, c, d.id))
        }
      }
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
        organizationId: "",
      })
    }

    // Seed users (5 per org = 15 total)
    const allUserIds: { orgId: string; userId: string; dept: string; name: string }[] = []
    for (const org of organizations) {
      const employees = fakeEmployees[org.id]
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i]
        const userId = `user-${org.id}-${i}`
        const email = `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@${org.name.toLowerCase().replace(/\s+/g, "")}.com`

        await setDoc(doc(db, "users", userId), {
          email,
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: i === 0 ? "admin" : "user",
          department: emp.department,
          jobTitle: "",
          phone: "",
          organizationId: org.id,
          createdAt: weeksAgo(12).toISOString(),
          lastLogin: new Date().toISOString(),
          authId: "",
        })

        allUserIds.push({
          orgId: org.id,
          userId,
          dept: emp.department,
          name: `${emp.firstName} ${emp.lastName}`,
        })
      }
    }

    // Seed 3 releases (one per template, each assigned to a different org)
    // Each covers the last 3 weeks of responses
    const releaseOrgMap = [
      { tmplIdx: 0, orgIdx: 0 }, // AI Productivity -> Acme Corp
      { tmplIdx: 1, orgIdx: 1 }, // Team Collaboration -> Envoy Design
      { tmplIdx: 2, orgIdx: 2 }, // Innovation -> Initech LLC
    ]

    for (const mapping of releaseOrgMap) {
      const tmpl = templates[mapping.tmplIdx]
      const org = organizations[mapping.orgIdx]
      const releaseId = `release-${tmpl.id}-${org.id}`

      await setDoc(doc(db, "schedules", releaseId), {
        templateId: tmpl.id,
        templateName: tmpl.name,
        organizationId: org.id,
        organizationName: org.name,
        department: "all",
        scheduleType: "now",
        scheduledAt: weeksAgo(3).toISOString(),
        activeFrom: weeksAgo(3).toISOString(),
        activeUntil: weeksAgo(0).toISOString(),
        recipientCount: 5,
        responseCount: 15, // 5 users x 3 weeks
        status: "completed",
        createdAt: weeksAgo(3).toISOString(),
        createdBy: "seed",
      })

      // Generate 3 weeks of responses for all 5 employees in this org
      const orgEmployees = allUserIds.filter((u) => u.orgId === org.id)
      for (let week = 0; week < 3; week++) {
        for (let empIdx = 0; empIdx < orgEmployees.length; empIdx++) {
          const emp = orgEmployees[empIdx]
          const responseId = `resp-${releaseId}-w${week}-${empIdx}`
          const completedDate = weeksAgo(2 - week) // week 0 = 2 weeks ago, week 2 = this week

          await setDoc(doc(db, "responses", responseId), {
            templateId: tmpl.id,
            releaseId,
            userId: emp.userId,
            userName: emp.name,
            organizationId: org.id,
            department: emp.dept,
            answers: generateAnswers(tmpl.questions, empIdx, week),
            completedAt: completedDate.toISOString(),
            weekOf: weekLabel(2 - week),
            weekDate: completedDate.toISOString(),
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Seeded 3 orgs, 15 users, 3 templates, 3 releases, 45 scorecard responses",
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("Seed error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
