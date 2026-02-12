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
    { firstName: "Tyler", lastName: "Brooks", department: "Operations" },
    { firstName: "Nadia", lastName: "Hassan", department: "HR" },
    { firstName: "Derek", lastName: "Fong", department: "Engineering" },
  ],
  "org-envoy": [
    { firstName: "Alex", lastName: "Kim", department: "Design" },
    { firstName: "Jordan", lastName: "Taylor", department: "Design" },
    { firstName: "Maya", lastName: "Singh", department: "Engineering" },
    { firstName: "Liam", lastName: "Foster", department: "Operations" },
    { firstName: "Olivia", lastName: "Nakamura", department: "Marketing" },
  ],
  "org-globex": [
    { firstName: "Hannah", lastName: "Cho", department: "Engineering" },
    { firstName: "Brandon", lastName: "Meyers", department: "Engineering" },
    { firstName: "Fatima", lastName: "Al-Rashid", department: "Product" },
    { firstName: "Connor", lastName: "Walsh", department: "Sales" },
    { firstName: "Simone", lastName: "Dubois", department: "Marketing" },
    { firstName: "Raj", lastName: "Kapoor", department: "Data Science" },
    { firstName: "Megan", lastName: "Schultz", department: "Operations" },
    { firstName: "Tomoko", lastName: "Sato", department: "Design" },
    { firstName: "Andre", lastName: "Jackson", department: "Customer Success" },
    { firstName: "Ines", lastName: "Pereira", department: "HR" },
  ],
  "org-initech": [
    { firstName: "David", lastName: "Thompson", department: "IT" },
    { firstName: "Rachel", lastName: "Greene", department: "IT" },
    { firstName: "Carlos", lastName: "Martinez", department: "Customer Success" },
    { firstName: "Amara", lastName: "Johnson", department: "Operations" },
    { firstName: "Ethan", lastName: "Burke", department: "HR" },
    { firstName: "Suki", lastName: "Tanaka", department: "IT" },
    { firstName: "Frank", lastName: "Novak", department: "Customer Success" },
    { firstName: "Layla", lastName: "Benali", department: "Operations" },
    { firstName: "Kevin", lastName: "O'Connell", department: "Executive" },
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
  },
  {
    id: "org-envoy",
    name: "Envoy Design",
    departments: ["Design", "Engineering", "Marketing", "Operations", "Executive"],
    website: "https://www.envoydesign.co",
    contactEmail: "hello@envoydesign.co",
    industry: "Design",
  },
  {
    id: "org-globex",
    name: "Globex Corporation",
    departments: ["Engineering", "Sales", "Marketing", "Product", "Data Science", "Operations", "Design", "Customer Success", "HR"],
    website: "https://www.globexcorp.com",
    contactEmail: "info@globexcorp.com",
    industry: "Consulting",
  },
  {
    id: "org-initech",
    name: "Initech LLC",
    departments: ["IT", "Operations", "HR", "Customer Success", "Executive"],
    website: "https://www.initech.com",
    contactEmail: "support@initech.com",
    industry: "Finance",
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
  const baseQuality = 5 + (employeeIdx % 4) // 5, 6, 7, 8 base
  const weekBoost = weekOffset * 0.4

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
    "Integrated AI summarization into our support pipeline",
    "Used Claude for contract review - caught two issues",
    "Built a Slack bot with AI to answer common questions",
    "AI-powered dashboards helped spot trends faster",
    "Automated onboarding docs with generative AI",
  ]

  for (const q of questions) {
    if (q.type === "scale") {
      const raw = baseQuality + weekBoost + (Math.random() * 2.5 - 0.75)
      answers[q.id] = Math.min(10, Math.max(1, Math.round(raw * 10) / 10))
    } else if (q.type === "number") {
      if (q.text.toLowerCase().includes("hours") || q.text.toLowerCase().includes("save")) {
        answers[q.id] = Math.floor(2 + employeeIdx * 0.5 + weekOffset * 0.5 + Math.random() * 3)
      } else if (q.text.toLowerCase().includes("unnecessary")) {
        answers[q.id] = Math.max(0, Math.floor(4 - weekOffset * 0.5 - Math.random() * 2))
      } else {
        answers[q.id] = Math.floor(1 + Math.random() * 5 + weekOffset * 0.3)
      }
    } else if (q.type === "text") {
      const idx = (employeeIdx * 3 + weekOffset * 2) % textResponses.length
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

    // Seed organizations (memberCount computed from actual employees)
    for (const org of organizations) {
      const empCount = fakeEmployees[org.id]?.length ?? 0
      await setDoc(doc(db, "organizations", org.id), {
        ...org,
        memberCount: empCount,
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

    // Seed users across all 4 orgs (8 + 5 + 10 + 9 = 32 total)
    const allUserIds: { orgId: string; userId: string; dept: string; name: string }[] = []
    for (const org of organizations) {
      const employees = fakeEmployees[org.id]
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i]
        const userId = `user-${org.id}-${i}`
        const emailDomain = org.name.toLowerCase().replace(/[^a-z]/g, "") + ".com"
        const email = `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase().replace(/'/g, "")}@${emailDomain}`

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
          authId: `seed-${userId}`,
        })

        allUserIds.push({
          orgId: org.id,
          userId,
          dept: emp.department,
          name: `${emp.firstName} ${emp.lastName}`,
        })
      }
    }

    // Seed releases and responses -- each org gets all 3 templates over 3 weeks
    for (const org of organizations) {
      const orgEmployees = allUserIds.filter((u) => u.orgId === org.id)
      for (const tmpl of templates) {
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
          recipientCount: orgEmployees.length,
          responseCount: orgEmployees.length,
          status: "completed",
          createdAt: weeksAgo(3).toISOString(),
          createdBy: "seed",
        })

        // 3 weeks of responses per employee
        for (let week = 0; week < 3; week++) {
          for (let empIdx = 0; empIdx < orgEmployees.length; empIdx++) {
            const emp = orgEmployees[empIdx]
            const responseId = `resp-${releaseId}-w${week}-${empIdx}`
            const completedDate = weeksAgo(2 - week)

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
    }

    const totalUsers = Object.values(fakeEmployees).reduce((sum, arr) => sum + arr.length, 0)
    const totalResponses = totalUsers * 3 * templates.length // users x weeks x templates

    return NextResponse.json({
      success: true,
      message: `Seeded 4 orgs, ${totalUsers} users, ${templates.length} templates, ${organizations.length * templates.length} releases, ${totalResponses} scorecard responses`,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("Seed error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
