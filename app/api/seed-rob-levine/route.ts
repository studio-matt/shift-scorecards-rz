import { NextResponse } from "next/server"
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  setDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

// Super admin emails to preserve and update
const SUPER_ADMIN_EMAILS = [
  "joe@shiftthework.com",
  "jmechlinski@shiftthework.com",
  "kristen@shiftthework.com",
  "kabbott@shiftthework.com",
  "kris10abbott@gmail.com",
  "matt@shiftthework.com",
  "mhampton@shiftthework.com",
  "matt@envoydesign.com",
]

// Rob Levine Law users from CSV data
const ROB_LEVINE_USERS = [
  { name: "Paula", email: "pbanos@roblevine.com", confidence: 9, biggestWin: "My biggest AI win this month was being able to edit AI-generated emails.", nextGoal: "Generate brief agendas with feedback examples to show my team during the open hours I have weekly with them." },
  { name: "Felipe Cardenas", email: "fcardenas@roblevine.com", confidence: 10, biggestWin: "Meeting follow ups, pending lists", nextGoal: "Automation, quicker follow ups, better meeting, and deliverables coverage" },
  { name: "Jena-Lynn Forcino", email: "JForcino@roblevine.com", confidence: 4, biggestWin: "Structuring my departments goals and time management", nextGoal: "Using AI to create reports and meeting plans" },
  { name: "Nick Trujillo", email: "ntrujillo@roblevine.com", confidence: 8, biggestWin: "Learning how to use Facilitator and Custom Summaries on Teams", nextGoal: "Learn about Agents" },
  { name: "Jair Robles", email: "jrobles@roblevine.com", confidence: 7, biggestWin: "Document analisis", nextGoal: "Getting froms out of it." },
  { name: "Rosemailene Aton", email: "raton@roblevine.com", confidence: 5, biggestWin: "Option to make emails more legal‑focused, liability‑oriented version", nextGoal: "Incorporate on tasks reports (it is currently not accurate)" },
  { name: "Nikcole", email: "ncotnoir@roblevine.com", confidence: 5, biggestWin: "Case reviews / medical reviews", nextGoal: "Attorneys saving time with med reviews and help with briefs" },
  { name: "Daniela Rubio", email: "drubio@roblevinelegalsolutions.com", confidence: 7, biggestWin: "Been able to improve our escalation processes and time it consumed to create each letter.", nextGoal: "Get AI to make my weekly cases assignation" },
  { name: "Mari", email: "mportes@roblevine.com", confidence: 8, biggestWin: "Setting up reminders or prompts", nextGoal: "Having it compare notes to each other or progress notes and give feedback." },
  { name: "Mindy Montecalvo", email: "mmontecalvo@roblevine.com", confidence: 5, biggestWin: "Drafting emails", nextGoal: "Learning how to use AI more" },
  { name: "Amy Mears", email: "amears@roblevine.com", confidence: 10, biggestWin: "Summarized medical records and created a summary of those records along with drafting a letter to send the summary to an ALJ", nextGoal: "Learn more and find other ways of saving time" },
  { name: "Maria Gaitan", email: "mgaitan@roblevinelegalsolutions.com", confidence: 8, biggestWin: "Using it more, I can see the learning path.", nextGoal: "Saving more time." },
  { name: "Dulce", email: "dmatus@roblevinelegalsolutions.com", confidence: 6, biggestWin: "Having all my 1-1s recorded and using the transcript is the best for me to send the summary to my team.", nextGoal: "automatization, I would like to leverage Copilot to evaluate my monthly action plan and provide better follow-up strategies and recommendations for my team." },
  { name: "Kimberly Dube", email: "kdube@roblevine.com", confidence: 7, biggestWin: "Using Co Pilot to help analyze data in excel", nextGoal: "to automate meaningful work" },
  { name: "Danna Renteria", email: "drenteria@roblevinelegalsolutions.com", confidence: 8, biggestWin: "I only use it for emails as of now", nextGoal: "would love to use it for more tasks" },
  { name: "Barbara-Ann Karpinski", email: "bkarpinski@roblevine.com", confidence: 8, biggestWin: "MMR reviews", nextGoal: "looking into crosschecking bills/recs" },
  { name: "Jose Haya", email: "jhaya@roblevine.com", confidence: 7, biggestWin: "I was able to create a prompt that will help me pull any text messages or email that need follow-up", nextGoal: "To be able to pull HLR evidence more accurately" },
  { name: "Grezza Brecio", email: "GBrecio@roblevine.com", confidence: 8, biggestWin: "Analyzing cases, notes, claimant contact thread. Helped me to prepare for team meeting this month.", nextGoal: "Use AI for performance review and data analysis." },
  { name: "Cassandra Musel", email: "cmusel@roblevine.com", confidence: 4, biggestWin: "Drafting complaints", nextGoal: "Using it to create Excel Spreadsheets" },
  { name: "Daniela Vergara", email: "DVergara@roblevine.com", confidence: 10, biggestWin: "Maing coaching form templates", nextGoal: "creating a data base" },
  { name: "Francisca Minaya", email: "fminaya@roblevinelegalsolutions.com", confidence: 8, biggestWin: "better email: improving wording, tone, or professionalism.", nextGoal: "improve Decision-Making With AI" },
  { name: "Petra Elder", email: "pelder@roblevine.com", confidence: 5, biggestWin: "Outlook search results", nextGoal: "goal is to use it more often" },
  { name: "Madeline Mcmahon", email: "mmcmahon@roblevine.com", confidence: 6, biggestWin: "using it to provide me a summary", nextGoal: "get to know me" },
  { name: "Dareth Doyon", email: "ddoyon@roblevine.com", confidence: 7, biggestWin: "Finding manuals that are in my email", nextGoal: "Having AI help me with post meeting notes" },
  { name: "Alpha Antonio", email: "aantonio@roblevine.com", confidence: 6, biggestWin: "Getting the date range of medical records.", nextGoal: "AI doing data entry" },
  { name: "Bruno Rojas", email: "brojas@roblevinelegalsolutions.com", confidence: 8, biggestWin: "has helped me create a report and determine what providers are EHR applicable and which are not", nextGoal: "to keep on learning" },
  { name: "Aefraim Sunga", email: "asunga@roblevine.com", confidence: 7, biggestWin: "Reviewing Health insurance lien and Medical management logs", nextGoal: "It would be using prompt more effectively designed for my job specifically." },
  { name: "Jeff O'Neill", email: "joneill@roblevine.com", confidence: 6, biggestWin: "Document Synopsis", nextGoal: "Cross reporting analytics" },
  { name: "Estefania Montoya", email: "emontoya@roblevine.com", confidence: 8, biggestWin: "Generating a report and workplan for overdue tasks", nextGoal: "Use it to make better instructions" },
  { name: "Jamie Jones", email: "JJones@RobLevine.com", confidence: 6, biggestWin: "Breaking down rating decisions to explain if they met the criteria for the next higher rating", nextGoal: "Get more familiar so I can use it more" },
  { name: "Shawanda Yeldell Lewis", email: "syeldell-lewis@roblevinelegalsolutions.com", confidence: 10, biggestWin: "My efforts being reduced and the time it requires to do my job being reduced.", nextGoal: "Taking it one day at a time, but learning all ways to better assist training and learning and development...." },
  { name: "Johan Luna", email: "JLuna@RobLevineLegalSolutions.com", confidence: 10, biggestWin: "Automate coaching summaries and email sending", nextGoal: "Automate Excel repetitive tasks for reports" },
  { name: "Hazel Catilo", email: "hcatilo@roblevine.com", confidence: 8, biggestWin: "Reviews are easier and faster.", nextGoal: "Use copilot to organize my day." },
  { name: "David Salazar", email: "dsalazar@roblevine.com", confidence: 6, biggestWin: "Organizing my day better", nextGoal: "how to specify ai prompts to my specific role" },
  { name: "Peter Reilly", email: "preilly@roblevinelegalsolutions.com", confidence: 9, biggestWin: "Using Copilot to compare reports, analyze stats/analytics which saves the time it used to take doing it manually with excel formulas and manual comparison", nextGoal: "Using AI to solve some of my more big picture issues versus just making every day tasks easier." },
  { name: "Sharmaine Nadela", email: "snadela@roblevine.com", confidence: 10, biggestWin: "Creating prompts for VA Teams for Medical Chronology", nextGoal: "To be an AI superwoman :)" },
  { name: "Barbara Karpinski", email: "Bkarpinski@roblevine.com", confidence: 8, biggestWin: "1:1 agendas", nextGoal: "1:1 and meeting prep. Document reviews" },
  { name: "Javier Tovar", email: "JTovar@roblevinelegalsolutions.com", confidence: 5, biggestWin: "have to use it more and for more tasks", nextGoal: "use it more for meetings, reports, and ideas" },
  { name: "LeeAnn Freeman", email: "lfreeman@roblevinelegalsolutions.com", confidence: 10, biggestWin: "Using it to compare long reports/ notes", nextGoal: "To customize my AI to my liking" },
  { name: "Diego Pancorvo", email: "dpancorvo@roblevine.com", confidence: 6, biggestWin: "Summarizing long email threats and creating concise responses", nextGoal: "Using AI to help me manage the team in things such as delegated emails and PTO requests" },
  { name: "Jean Risco", email: "Jrisco@roblevine.com", confidence: 8, biggestWin: "Helped me prepare for a meeting with my TL", nextGoal: "Draft E-mails to subrogation depts to remove unrelated charges" },
]

// Departments to randomly assign
const DEPARTMENTS = [
  "Legal Operations",
  "Case Management", 
  "Client Services",
  "Administration",
  "VA Claims",
  "Medical Records",
]

// Get the Monday of the current week
function getCurrentWeekOf() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split("T")[0]
}

// Helper to convert time string to HOURS (numeric value for time_saving questions)
// These are the actual hours saved values that match the 1-10 scale
function timeToHours(timeStr: string): number {
  if (timeStr.includes("Not using AI yet")) return 0
  if (timeStr.includes("Under 2 minutes")) return 0
  if (timeStr.includes("2–5 minutes")) return 0
  if (timeStr.includes("6–10 minutes")) return 0
  if (timeStr.includes("11–15 minutes")) return 0
  if (timeStr.includes("16+ minutes")) return 0.5
  if (timeStr.includes("30 minutes - 1 hour")) return 1
  if (timeStr.includes("1-2 hours")) return 2
  if (timeStr.includes("2-4 hours")) return 3
  if (timeStr.includes("4+ hours")) return 5
  return 1 // default
}

// Helper to convert email count string to number
function emailCountToNumber(str: string): number {
  if (str.includes("0–5")) return 3
  if (str.includes("6–10")) return 8
  if (str.includes("11–20")) return 15
  if (str.includes("21–40")) return 30
  if (str.includes("41+")) return 50
  return 10
}

// Helper to convert meeting count string to number  
function meetingCountToNumber(str: string): number {
  if (str.includes("0–5")) return 3
  if (str.includes("6–10")) return 8
  if (str.includes("11–15")) return 13
  if (str.includes("16–20")) return 18
  if (str.includes("21+")) return 25
  return 5
}

export async function GET() {
  return seedRobLevineData()
}

export async function POST() {
  return seedRobLevineData()
}

async function seedRobLevineData() {
  try {
    const results = {
      usersDeleted: 0,
      responsesDeleted: 0,
      usersCreated: 0,
      responsesCreated: 0,
      adminsUpdated: 0,
      organizationCreated: false,
      errors: [] as string[],
    }

    // 1. Get all existing users
    const usersSnapshot = await getDocs(collection(db, "users"))
    const existingUsers = usersSnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as { id: string; email?: string }[]

    // 2. Delete non-admin users
    for (const user of existingUsers) {
      const email = user.email?.toLowerCase() || ""
      const isAdmin = SUPER_ADMIN_EMAILS.some(
        (adminEmail) => adminEmail.toLowerCase() === email
      )
      if (!isAdmin) {
        await deleteDoc(doc(db, "users", user.id))
        results.usersDeleted++
      }
    }

    // 3. Delete all existing responses
    const responsesSnapshot = await getDocs(collection(db, "responses"))
    for (const responseDoc of responsesSnapshot.docs) {
      await deleteDoc(doc(db, "responses", responseDoc.id))
      results.responsesDeleted++
    }

    // 4. Create or get Rob Levine Law organization
    const orgsSnapshot = await getDocs(collection(db, "organizations"))
    let robLevineOrgId = ""
    
    for (const orgDoc of orgsSnapshot.docs) {
      const orgData = orgDoc.data()
      if (orgData.name?.toLowerCase().includes("rob levine")) {
        robLevineOrgId = orgDoc.id
        break
      }
    }

    if (!robLevineOrgId) {
      // Create new organization
      const orgRef = doc(collection(db, "organizations"))
      await setDoc(orgRef, {
        name: "Rob Levine Law",
        slug: "rob-levine-law",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          emailNotifications: true,
          weeklyReminders: true,
        },
      })
      robLevineOrgId = orgRef.id
      results.organizationCreated = true
    }

    // 5. Get the template
    const templatesSnapshot = await getDocs(collection(db, "templates"))
    const templates = templatesSnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    
    if (templates.length === 0) {
      return NextResponse.json(
        { error: "No templates found. Please create a scorecard template first." },
        { status: 400 }
      )
    }

    const template = templates[0] as { 
      id: string
      name?: string
      questions?: Array<{ id: string; type: string; text?: string }>
    }

    // 6. Get active release
    const schedulesSnapshot = await getDocs(collection(db, "schedules"))
    const schedules = schedulesSnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    const activeRelease = schedules.find(
      (s) => (s as { status?: string }).status === "active"
    ) as { id: string } | undefined

    // 7. Update super admins to be associated with Rob Levine Law
    const adminUsersSnapshot = await getDocs(collection(db, "users"))
    for (const userDoc of adminUsersSnapshot.docs) {
      const userData = userDoc.data()
      const email = userData.email?.toLowerCase() || ""
      const isAdmin = SUPER_ADMIN_EMAILS.some(
        (adminEmail) => adminEmail.toLowerCase() === email
      )
      if (isAdmin) {
        // Update the admin user to be associated with Rob Levine Law
        await setDoc(doc(db, "users", userDoc.id), {
          ...userData,
          organizationId: robLevineOrgId,
          updatedAt: new Date().toISOString(),
        })
        results.adminsUpdated++
        
        // Also create a scorecard response for this admin so they see individual-level data
        const adminAnswers: Record<string, number | string> = {}
        if (template.questions) {
          for (const question of template.questions) {
            const questionText = (question.text || "").toLowerCase()
            if (question.type === "confidence" || questionText.includes("confidence")) {
              adminAnswers[question.id] = 9 // High confidence for admins
            } else if (questionText.includes("biggest") && questionText.includes("win")) {
              adminAnswers[question.id] = "Successfully onboarded new team members to AI tools"
            } else if (questionText.includes("goal") || questionText.includes("next")) {
              adminAnswers[question.id] = "Expand AI adoption across all departments"
            } else if (question.type === "scale" || question.type === "number") {
              adminAnswers[question.id] = Math.floor(Math.random() * 3) + 7 // 7-9 range
            } else if (question.type === "text") {
              adminAnswers[question.id] = "Great progress with AI implementation"
            } else if (question.type === "multichoice") {
              adminAnswers[question.id] = "1-2 hours"
            }
          }
        }
        
        // Delete any existing responses for this admin
        const adminResponsesQuery = query(
          collection(db, "responses"),
          where("userId", "==", userDoc.id)
        )
        const adminExistingResponses = await getDocs(adminResponsesQuery)
        for (const respDoc of adminExistingResponses.docs) {
          await deleteDoc(doc(db, "responses", respDoc.id))
        }
        
        // Create new response for admin
        await addDoc(collection(db, "responses"), {
          templateId: template.id,
          releaseId: activeRelease?.id || null,
          userId: userDoc.id,
          organizationId: robLevineOrgId,
          answers: adminAnswers,
          completedAt: new Date().toISOString(),
          weekOf: getCurrentWeekOf(),
          createdAt: new Date().toISOString(),
        })
      }
    }

    // 8. Create users and responses
    const weekOf = getCurrentWeekOf()

    for (const userData of ROB_LEVINE_USERS) {
      // Parse name into first/last
      const nameParts = userData.name.split(" ")
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(" ") || ""
      
      // Random department
      const department = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)]

      // Create user
      const userRef = doc(collection(db, "users"))
      await setDoc(userRef, {
        email: userData.email.toLowerCase(),
        firstName,
        lastName,
        department,
        organizationId: robLevineOrgId,
        role: "user",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          showOnLeaderboard: true,
          emailNotifications: true,
        },
      })
      results.usersCreated++

      // Build answers based on template questions
      const answers: Record<string, number | string> = {}
      
      if (template.questions) {
        for (const question of template.questions) {
          const questionText = (question.text || "").toLowerCase()
          
          // Match questions to CSV data
          if (question.type === "confidence" || questionText.includes("confidence")) {
            answers[question.id] = userData.confidence
          } else if (questionText.includes("biggest") && questionText.includes("win")) {
            answers[question.id] = userData.biggestWin
          } else if (questionText.includes("goal") || questionText.includes("next")) {
            answers[question.id] = userData.nextGoal
          } else if (question.type === "scale" || question.type === "number") {
            // Random scale value between 4-10 for other scale questions
            answers[question.id] = Math.floor(Math.random() * 7) + 4
          } else if (question.type === "text") {
            answers[question.id] = userData.biggestWin
          } else if (question.type === "multichoice") {
            // Will be handled by default
            answers[question.id] = "30 minutes - 1 hour"
          }
        }
      }

      // Create response
      await addDoc(collection(db, "responses"), {
        templateId: template.id,
        releaseId: activeRelease?.id || null,
        userId: userRef.id,
        organizationId: robLevineOrgId,
        answers,
        completedAt: new Date().toISOString(),
        weekOf,
        createdAt: new Date().toISOString(),
      })
      results.responsesCreated++
    }

    return NextResponse.json({
      success: true,
      message: `Seeded Rob Levine Law data successfully`,
      organization: "Rob Levine Law",
      organizationId: robLevineOrgId,
      template: template.name || "Unknown",
      weekOf,
      ...results,
    })
  } catch (error) {
    console.error("Error seeding Rob Levine data:", error)
    return NextResponse.json(
      { error: "Failed to seed data", details: String(error) },
      { status: 500 }
    )
  }
}
