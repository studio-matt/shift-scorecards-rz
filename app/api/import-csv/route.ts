import { NextResponse } from "next/server"
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

// Get the Monday of the current week
function getCurrentWeekOf() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split("T")[0]
}

// Convert time string to HOURS (numeric value)
function timeToHours(timeStr: string): number {
  if (!timeStr) return 0
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
  return 0
}

// The actual data from the CSV - only keeping the most recent response per person
// Columns: ID, Name, Email, Emails/day, Time saved emails, Before AI minutes, After AI minutes, 
// Edit time, Meetings/week, Time saved meeting prep, Time saved meeting followup,
// Time saved doc review, Time saved doc prep, Time saved research, Time saved summarizing,
// Biggest win, Next goal, Confidence, Response Type, Start Date, Stage Date, Submit Date, Network ID, Tags, Ending
const CSV_DATA = [
  { name: "Paula", email: "pbanos@roblevine.com", emailTimeSaved: "1-2 hours", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "2-4 hours", docPrepSaved: "30 minutes - 1 hour", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "My biggest AI win this month was being able to edit AI-generated emails.", nextGoal: "Generate brief agendas with feedback examples to show my team during the open hours I have weekly with them.", confidence: 9 },
  { name: "Felipe Cardenas", email: "fcardenas@roblevine.com", emailTimeSaved: "1-2 hours", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "30 minutes - 1 hour", researchSaved: "1-2 hours", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Meeting follow ups, pending lists", nextGoal: "Automation, quicker follow ups, better meeting, and deliverables coverage", confidence: 10 },
  { name: "Jena-Lynn Forcino", email: "JForcino@roblevine.com", emailTimeSaved: "1-2 hours", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "Not using AI yet (0 hours)", docPrepSaved: "Not using AI yet (0 hours)", researchSaved: "30 minutes - 1 hour", summarizingSaved: "Not using AI yet (0 hours)", biggestWin: "Structuring my departments goals and time management", nextGoal: "Using AI to create reports and meeting plans", confidence: 4 },
  { name: "Nick Trujillo", email: "ntrujillo@roblevine.com", emailTimeSaved: "1-2 hours", meetingPrepSaved: "1-2 hours", meetingFollowupSaved: "1-2 hours", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "Not using AI yet (0 hours)", researchSaved: "1-2 hours", summarizingSaved: "1-2 hours", biggestWin: "Learning how to use Facilitator and Custom Summaries on Teams", nextGoal: "Learn about Agents", confidence: 8 },
  { name: "Jair Robles", email: "jrobles@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "2-4 hours", docPrepSaved: "30 minutes - 1 hour", researchSaved: "1-2 hours", summarizingSaved: "1-2 hours", biggestWin: "Document analisis", nextGoal: "Getting froms out of it.", confidence: 7 },
  { name: "Rosemailene Aton", email: "raton@roblevine.com", emailTimeSaved: "1-2 hours", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "Not using AI yet (0 hours)", docPrepSaved: "Not using AI yet (0 hours)", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Option to make emails more legal‑focused, liability‑oriented version", nextGoal: "Incorporate on tasks reports (it is currently not accurate)", confidence: 5 },
  { name: "Nikcole", email: "ncotnoir@roblevine.com", emailTimeSaved: "Not using AI yet (0 hours)", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "Not using AI yet (0 hours)", docPrepSaved: "Not using AI yet (0 hours)", researchSaved: "Not using AI yet (0 hours)", summarizingSaved: "Not using AI yet (0 hours)", biggestWin: "Case reviews / medical reviews", nextGoal: "Attorneys saving time with med reviews and help with briefs", confidence: 5 },
  { name: "Daniela Rubio", email: "drubio@roblevinelegalsolutions.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "1-2 hours", meetingFollowupSaved: "1-2 hours", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "2-4 hours", researchSaved: "30 minutes - 1 hour", summarizingSaved: "1-2 hours", biggestWin: "Been able to improve our escalation processes and time it consumed to create each letter.", nextGoal: "Get AI to make my weekly cases assignation", confidence: 7 },
  { name: "Mari", email: "mportes@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "30 minutes - 1 hour", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Setting up reminders or prompts", nextGoal: "Having it compare notes to each other or progress notes and give feedback.", confidence: 8 },
  { name: "Mindy Montecalvo", email: "mmontecalvo@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "Not using AI yet (0 hours)", docPrepSaved: "Not using AI yet (0 hours)", researchSaved: "2-4 hours", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Drafting emails", nextGoal: "Learning how to use AI more", confidence: 5 },
  { name: "Amy Mears", email: "amears@roblevine.com", emailTimeSaved: "2-4 hours", meetingPrepSaved: "1-2 hours", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "4+ hours", docPrepSaved: "30 minutes - 1 hour", researchSaved: "4+ hours", summarizingSaved: "4+ hours", biggestWin: "Summarized medical records and created a summary of those records along with drafting a letter to send the summary to an ALJ", nextGoal: "Learn more and find other ways of saving time", confidence: 10 },
  { name: "Maria Gaitan", email: "mgaitan@roblevinelegalsolutions.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "1-2 hours", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "30 minutes - 1 hour", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Using it more, I can see the learning path.", nextGoal: "Saving more time.", confidence: 8 },
  { name: "Dulce", email: "dmatus@roblevinelegalsolutions.com", emailTimeSaved: "1-2 hours", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "30 minutes - 1 hour", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Having all my 1-1s recorded and using the transcript is the best for me to send the summary to my team.", nextGoal: "automatization, I would like to leverage Copilot to evaluate my monthly action plan and provide better follow-up strategies and recommendations for my team.", confidence: 6 },
  { name: "Kimberly Dube", email: "kdube@roblevine.com", emailTimeSaved: "2-4 hours", meetingPrepSaved: "1-2 hours", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "1-2 hours", researchSaved: "2-4 hours", summarizingSaved: "1-2 hours", biggestWin: "Using Co Pilot to help analyze data in excel", nextGoal: "to automate meaningful work", confidence: 7 },
  { name: "Danna Renteria", email: "drenteria@roblevinelegalsolutions.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "1-2 hours", docPrepSaved: "Not using AI yet (0 hours)", researchSaved: "1-2 hours", summarizingSaved: "Not using AI yet (0 hours)", biggestWin: "I only use it for emails as of now", nextGoal: "would love to use it for more tasks", confidence: 8 },
  { name: "Barbara-Ann Karpinski", email: "bkarpinski@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "1-2 hours", meetingFollowupSaved: "1-2 hours", docReviewSaved: "4+ hours", docPrepSaved: "1-2 hours", researchSaved: "30 minutes - 1 hour", summarizingSaved: "4+ hours", biggestWin: "MMR reviews", nextGoal: "looking into crosschecking bills/recs", confidence: 8 },
  { name: "Jose Haya", email: "jhaya@roblevine.com", emailTimeSaved: "1-2 hours", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "1-2 hours", docPrepSaved: "1-2 hours", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "I was able to create a prompt that will help me pull any text messages or email that need follow-up", nextGoal: "To be able to pull HLR evidence more accurately", confidence: 7 },
  { name: "Grezza Brecio", email: "GBrecio@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "1-2 hours", docPrepSaved: "1-2 hours", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Analyzing cases, notes, claimant contact thread. Helped me to prepare for team meeting this month.", nextGoal: "Use AI for performance review and data analysis.", confidence: 8 },
  { name: "Cassandra Musel", email: "cmusel@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "Not using AI yet (0 hours)", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Drafting complaints", nextGoal: "Using it to create Excel Spreadsheets", confidence: 4 },
  { name: "Daniela", email: "DVergara@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "2-4 hours", docPrepSaved: "30 minutes - 1 hour", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Maing coaching form templates", nextGoal: "creating a data base", confidence: 10 },
  { name: "Francisca Minaya", email: "fminaya@roblevinelegalsolutions.com", emailTimeSaved: "2-4 hours", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "1-2 hours", docPrepSaved: "2-4 hours", researchSaved: "1-2 hours", summarizingSaved: "2-4 hours", biggestWin: "better email: improving wording, tone, or professionalism.", nextGoal: "improve Decision-Making With AI", confidence: 8 },
  { name: "Petra Elder", email: "pelder@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "30 minutes - 1 hour", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Outlook search results", nextGoal: "goal is to use it more often", confidence: 5 },
  { name: "Madeline Mcmahon", email: "mmcmahon@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "Not using AI yet (0 hours)", docPrepSaved: "30 minutes - 1 hour", researchSaved: "1-2 hours", summarizingSaved: "1-2 hours", biggestWin: "using it to provide me a summary", nextGoal: "get to know me", confidence: 6 },
  { name: "Dareth", email: "ddoyon@roblevine.com", emailTimeSaved: "Not using AI yet (0 hours)", meetingPrepSaved: "1-2 hours", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "Not using AI yet (0 hours)", docPrepSaved: "Not using AI yet (0 hours)", researchSaved: "1-2 hours", summarizingSaved: "1-2 hours", biggestWin: "Finding manuals that are in my email", nextGoal: "Having AI help me with post meeting notes", confidence: 7 },
  { name: "Alpha Antonio", email: "aantonio@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "30 minutes - 1 hour", researchSaved: "1-2 hours", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Getting the date range of medical records.", nextGoal: "AI doing data entry", confidence: 6 },
  { name: "Bruno Rojas", email: "brojas@roblevinelegalsolutions.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "1-2 hours", meetingFollowupSaved: "2-4 hours", docReviewSaved: "1-2 hours", docPrepSaved: "1-2 hours", researchSaved: "1-2 hours", summarizingSaved: "1-2 hours", biggestWin: "has helped me create a report and determine what providers are EHR applicable and which are not", nextGoal: "to keep on learning", confidence: 8 },
  { name: "Aefraim", email: "asunga@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "30 minutes - 1 hour", researchSaved: "1-2 hours", summarizingSaved: "1-2 hours", biggestWin: "Reviewing Health insurance lien and Medical management logs", nextGoal: "It would be using prompt more effectively designed for my job specifically.", confidence: 7 },
  { name: "Jeff O'Neill", email: "joneill@roblevine.com", emailTimeSaved: "4+ hours", meetingPrepSaved: "1-2 hours", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "Not using AI yet (0 hours)", docPrepSaved: "Not using AI yet (0 hours)", researchSaved: "Not using AI yet (0 hours)", summarizingSaved: "1-2 hours", biggestWin: "Document Synopsis", nextGoal: "Cross reporting analytics", confidence: 6 },
  { name: "Estefanía", email: "emontoya@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "2-4 hours", docPrepSaved: "1-2 hours", researchSaved: "2-4 hours", summarizingSaved: "1-2 hours", biggestWin: "Generating a report and workplan for overdue tasks", nextGoal: "Use it to make better instructions", confidence: 8 },
  { name: "Jamie Jones", email: "JJones@RobLevine.com", emailTimeSaved: "1-2 hours", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "30 minutes - 1 hour", researchSaved: "1-2 hours", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Breaking down rating decisions to explain if they met the criteria for the next higher rating", nextGoal: "Get more familiar so I can use it more", confidence: 6 },
  { name: "Shawanda Yeldell Lewis", email: "syeldell-lewis@roblevinelegalsolutions.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "1-2 hours", meetingFollowupSaved: "1-2 hours", docReviewSaved: "1-2 hours", docPrepSaved: "1-2 hours", researchSaved: "2-4 hours", summarizingSaved: "1-2 hours", biggestWin: "My efforts being reduced and the time it requires to do my job being reduced.", nextGoal: "Taking it one day at a time, but learning all ways to better assist training and learning and development....", confidence: 10 },
  { name: "Johan Luna", email: "JLuna@RobLevineLegalSolutions.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "2-4 hours", meetingFollowupSaved: "1-2 hours", docReviewSaved: "Not using AI yet (0 hours)", docPrepSaved: "30 minutes - 1 hour", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Automate coaching summaries and email sending", nextGoal: "Automate Excel repetitive tasks for reports", confidence: 10 },
  { name: "Hazel Catilo", email: "hcatilo@roblevine.com", emailTimeSaved: "1-2 hours", meetingPrepSaved: "30 minutes - 1 hour", meetingFollowupSaved: "1-2 hours", docReviewSaved: "1-2 hours", docPrepSaved: "1-2 hours", researchSaved: "1-2 hours", summarizingSaved: "1-2 hours", biggestWin: "Reviews are easier and faster.", nextGoal: "Use copilot to organize my day.", confidence: 8 },
  { name: "David Salazar", email: "dsalazar@roblevine.com", emailTimeSaved: "1-2 hours", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "1-2 hours", docPrepSaved: "1-2 hours", researchSaved: "2-4 hours", summarizingSaved: "1-2 hours", biggestWin: "Organizing my day better", nextGoal: "how to specify ai prompts to my specific role", confidence: 6 },
  { name: "Peter Reilly", email: "preilly@roblevinelegalsolutions.com", emailTimeSaved: "1-2 hours", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "30 minutes - 1 hour", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Using Copilot to compare reports, analyze stats/analytics which saves the time it used to take doing it manually with excel formulas and manual comparison", nextGoal: "Using AI to solve some of my more big picture issues versus just making every day tasks easier.", confidence: 9 },
  { name: "Sharmaine Nadela", email: "snadela@roblevine.com", emailTimeSaved: "2-4 hours", meetingPrepSaved: "2-4 hours", meetingFollowupSaved: "2-4 hours", docReviewSaved: "2-4 hours", docPrepSaved: "2-4 hours", researchSaved: "4+ hours", summarizingSaved: "4+ hours", biggestWin: "Creating prompts for VA Teams for Medical Chronology", nextGoal: "To be an AI superwoman :)", confidence: 10 },
  { name: "Barbara Karpinski", email: "Bkarpinski@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "2-4 hours", meetingFollowupSaved: "1-2 hours", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "30 minutes - 1 hour", researchSaved: "Not using AI yet (0 hours)", summarizingSaved: "30 minutes - 1 hour", biggestWin: "1:1 agendas", nextGoal: "1:1 and meeting prep. Document reviews", confidence: 8 },
  { name: "Javier Tovar", email: "JTovar@roblevinelegalsolutions.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "Not using AI yet (0 hours)", docPrepSaved: "Not using AI yet (0 hours)", researchSaved: "1-2 hours", summarizingSaved: "30 minutes - 1 hour", biggestWin: "have to use it more and for more tasks", nextGoal: "use it more for meetings, reports, and ideas", confidence: 5 },
  { name: "LeeAnn Freeman", email: "lfreeman@roblevinelegalsolutions.com", emailTimeSaved: "1-2 hours", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "2-4 hours", docPrepSaved: "2-4 hours", researchSaved: "4+ hours", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Using it to compare long reports/ notes", nextGoal: "To customize my AI to my liking", confidence: 10 },
  { name: "Diego Pancorvo", email: "dpancorvo@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "Not using AI yet (0 hours)", docReviewSaved: "30 minutes - 1 hour", docPrepSaved: "Not using AI yet (0 hours)", researchSaved: "30 minutes - 1 hour", summarizingSaved: "30 minutes - 1 hour", biggestWin: "Summarizing long email threats and creating concise responses", nextGoal: "Using AI to help me manage the team in things such as delegated emails and PTO requests", confidence: 6 },
  { name: "Jean Risco", email: "Jrisco@roblevine.com", emailTimeSaved: "30 minutes - 1 hour", meetingPrepSaved: "Not using AI yet (0 hours)", meetingFollowupSaved: "30 minutes - 1 hour", docReviewSaved: "Not using AI yet (0 hours)", docPrepSaved: "Not using AI yet (0 hours)", researchSaved: "Not using AI yet (0 hours)", summarizingSaved: "Not using AI yet (0 hours)", biggestWin: "Helped me prepare for a meeting with my TL", nextGoal: "Draft E-mails to subrogation depts to remove unrelated charges", confidence: 8 },
]

// Envoy Design admin response (Matt)
const ENVOY_RESPONSE = {
  name: "Matt Hampton",
  email: "matt@envoydesign.com",
  emailTimeSaved: "2-4 hours",
  meetingPrepSaved: "1-2 hours",
  meetingFollowupSaved: "1-2 hours",
  docReviewSaved: "2-4 hours",
  docPrepSaved: "2-4 hours",
  researchSaved: "2-4 hours",
  summarizingSaved: "1-2 hours",
  biggestWin: "Successfully implemented AI-powered analytics dashboard for tracking team productivity",
  nextGoal: "Expand AI adoption metrics tracking across all client organizations",
  confidence: 9,
}

// Departments
const DEPARTMENTS = [
  "Legal Operations",
  "Case Management", 
  "Client Services",
  "Administration",
  "VA Claims",
  "Medical Records",
]

export async function GET() {
  return NextResponse.json({
    message: "CSV Import API",
    instructions: "POST to this endpoint to import data. Add ?dryRun=true to preview without changes.",
    dataCount: CSV_DATA.length + 1, // +1 for Envoy
  })
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get("dryRun") === "true"

  try {
    const results = {
      dryRun,
      responsesDeleted: 0,
      usersCreatedOrUpdated: 0,
      responsesCreated: 0,
      robLevineOrgId: "",
      envoyOrgId: "",
      templateId: "",
      errors: [] as string[],
    }

    // 1. Get or create organizations
    const orgsSnapshot = await getDocs(collection(db, "organizations"))
    
    for (const orgDoc of orgsSnapshot.docs) {
      const orgData = orgDoc.data()
      const name = (orgData.name || "").toLowerCase()
      if (name.includes("rob levine")) {
        results.robLevineOrgId = orgDoc.id
      } else if (name.includes("envoy")) {
        results.envoyOrgId = orgDoc.id
      }
    }

    if (!results.robLevineOrgId) {
      if (!dryRun) {
        const orgRef = doc(collection(db, "organizations"))
        await setDoc(orgRef, {
          name: "Rob Levine Law",
          slug: "rob-levine-law",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        results.robLevineOrgId = orgRef.id
      } else {
        results.robLevineOrgId = "would-create-new"
      }
    }

    if (!results.envoyOrgId) {
      if (!dryRun) {
        const orgRef = doc(collection(db, "organizations"))
        await setDoc(orgRef, {
          name: "Envoy Design",
          slug: "envoy-design",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        results.envoyOrgId = orgRef.id
      } else {
        results.envoyOrgId = "would-create-new"
      }
    }

    // 2. Get template
    const templatesSnapshot = await getDocs(collection(db, "templates"))
    const templates = templatesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    
    if (templates.length === 0) {
      return NextResponse.json({ error: "No templates found" }, { status: 400 })
    }

    const template = templates[0] as {
      id: string
      questions?: Array<{ id: string; type: string; text?: string }>
    }
    results.templateId = template.id

    // 3. Delete all existing responses (clean slate)
    if (!dryRun) {
      const responsesSnapshot = await getDocs(collection(db, "responses"))
      for (const respDoc of responsesSnapshot.docs) {
        await deleteDoc(doc(db, "responses", respDoc.id))
        results.responsesDeleted++
      }
    }

    // 4. Helper to build answers from CSV row data
    // Maps each time_saving question to its corresponding CSV field based on question text
    const buildAnswers = (data: typeof CSV_DATA[0]) => {
      const answers: Record<string, number | string> = {}
      
      if (!template.questions) return answers

      for (const question of template.questions) {
        const text = (question.text || "").toLowerCase()
        
        if (question.type === "confidence" || text.includes("confidence")) {
          answers[question.id] = data.confidence
        } else if (text.includes("biggest") && text.includes("win")) {
          answers[question.id] = data.biggestWin
        } else if (text.includes("goal") || text.includes("next")) {
          answers[question.id] = data.nextGoal
        } else if (question.type === "time_saving") {
          // Map each time_saving question to its specific CSV field based on text
          if (text.includes("email")) {
            answers[question.id] = timeToHours(data.emailTimeSaved)
          } else if (text.includes("meeting") && text.includes("prep")) {
            answers[question.id] = timeToHours(data.meetingPrepSaved)
          } else if (text.includes("meeting") && text.includes("follow")) {
            answers[question.id] = timeToHours(data.meetingFollowupSaved)
          } else if (text.includes("review") && text.includes("document")) {
            answers[question.id] = timeToHours(data.docReviewSaved)
          } else if (text.includes("prepare") && text.includes("document")) {
            answers[question.id] = timeToHours(data.docPrepSaved)
          } else if (text.includes("research")) {
            answers[question.id] = timeToHours(data.researchSaved)
          } else if (text.includes("summariz")) {
            answers[question.id] = timeToHours(data.summarizingSaved)
          } else {
            // Default: use average of all time fields
            answers[question.id] = Math.round((
              timeToHours(data.emailTimeSaved) +
              timeToHours(data.meetingPrepSaved) +
              timeToHours(data.meetingFollowupSaved) +
              timeToHours(data.docReviewSaved) +
              timeToHours(data.docPrepSaved) +
              timeToHours(data.researchSaved) +
              timeToHours(data.summarizingSaved)
            ) / 7)
          }
        } else if (question.type === "scale" || question.type === "number") {
          // For other scale questions, use a value based on confidence
          answers[question.id] = Math.max(1, Math.min(10, data.confidence + Math.floor(Math.random() * 3) - 1))
        }
      }
      
      return answers
    }

    // 5. Create Rob Levine users and responses
    const weekOf = getCurrentWeekOf()
    const now = new Date().toISOString()

    for (const csvRow of CSV_DATA) {
      const nameParts = csvRow.name.split(" ")
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(" ") || ""
      const department = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)]

      if (!dryRun) {
        // Check if user already exists
        const usersSnapshot = await getDocs(collection(db, "users"))
        let existingUserId = ""
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data()
          if (userData.email?.toLowerCase() === csvRow.email.toLowerCase()) {
            existingUserId = userDoc.id
            break
          }
        }

        let userId = existingUserId
        if (!existingUserId) {
          const userRef = doc(collection(db, "users"))
          await setDoc(userRef, {
            email: csvRow.email.toLowerCase(),
            firstName,
            lastName,
            department,
            organizationId: results.robLevineOrgId,
            role: "user",
            status: "active",
            createdAt: now,
            updatedAt: now,
          })
          userId = userRef.id
        }

        // Create response
        const answers = buildAnswers(csvRow)
        await addDoc(collection(db, "responses"), {
          templateId: template.id,
          userId,
          organizationId: results.robLevineOrgId,
          answers,
          completedAt: now,
          weekOf,
          createdAt: now,
        })
        results.responsesCreated++
      }
      results.usersCreatedOrUpdated++
    }

    // 6. Create Envoy Design response for Matt
    if (!dryRun) {
      // Find or create Matt's user
      const usersSnapshot = await getDocs(collection(db, "users"))
      let mattUserId = ""
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()
        if (userData.email?.toLowerCase() === ENVOY_RESPONSE.email.toLowerCase()) {
          mattUserId = userDoc.id
          // Update org association
          await setDoc(doc(db, "users", userDoc.id), {
            ...userData,
            organizationId: results.envoyOrgId,
            updatedAt: now,
          })
          break
        }
      }

      if (!mattUserId) {
        const userRef = doc(collection(db, "users"))
        await setDoc(userRef, {
          email: ENVOY_RESPONSE.email.toLowerCase(),
          firstName: "Matt",
          lastName: "Hampton",
          department: "Leadership",
          organizationId: results.envoyOrgId,
          role: "super_admin",
          status: "active",
          createdAt: now,
          updatedAt: now,
        })
        mattUserId = userRef.id
      }

      // Create response for Matt
      const mattAnswers = buildAnswers(ENVOY_RESPONSE)
      await addDoc(collection(db, "responses"), {
        templateId: template.id,
        userId: mattUserId,
        organizationId: results.envoyOrgId,
        answers: mattAnswers,
        completedAt: now,
        weekOf,
        createdAt: now,
      })
      results.responsesCreated++
    }
    results.usersCreatedOrUpdated++

    return NextResponse.json({
      success: true,
      message: dryRun 
        ? `DRY RUN: Would create ${results.responsesCreated || CSV_DATA.length + 1} responses`
        : `Created ${results.responsesCreated} responses (42 Rob Levine + 1 Envoy)`,
      weekOf,
      ...results,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
