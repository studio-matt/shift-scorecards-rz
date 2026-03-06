import { getDocument, COLLECTIONS } from "./firestore"
import type { LucideIcon } from "lucide-react"
import {
  MessageSquare,
  Brain,
  Zap,
  Lightbulb,
  BookOpen,
  Sparkles,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────
export interface ActionPrompt {
  id: string
  category: string
  action: string
  prompt: string
}

export interface PromptPackPrompt {
  name: string
  template: string
}

export interface PromptPack {
  id: string
  title: string
  icon: string
  category: string
  description: string
  prompts: PromptPackPrompt[]
}

export interface PromptSettings {
  actionPrompts: ActionPrompt[]
  promptPacks: PromptPack[]
}

// ─── Icon mapping ─────────────────────────────────────────────────────
export const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare,
  Brain,
  Zap,
  Lightbulb,
  BookOpen,
  Sparkles,
}

export function getIconComponent(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || BookOpen
}

// ─── Default Data (fallback if no settings exist) ─────────────────────
export const DEFAULT_ACTION_PROMPTS: ActionPrompt[] = [
  {
    id: "doc-creation",
    category: "document creation",
    action: "Try using Claude to draft your next proposal from scratch.",
    prompt: "I need to write a [TYPE] proposal for [CLIENT/PROJECT]. The key points to cover are: [LIST KEY POINTS]. Please draft a professional proposal that emphasizes [VALUE PROPOSITION]. Include an executive summary, scope of work, timeline, and pricing structure."
  },
  {
    id: "research",
    category: "research & analysis",
    action: "Let AI help you synthesize research findings faster.",
    prompt: "I have research data on [TOPIC] from [SOURCES]. Please analyze this information and provide: 1) Key themes and patterns, 2) Contradictions or gaps, 3) Actionable recommendations, 4) Questions for further research."
  },
  {
    id: "data-reporting",
    category: "data & reporting",
    action: "Use AI to turn raw data into executive summaries.",
    prompt: "Here is my [TYPE] data: [PASTE DATA]. Please create an executive summary that includes: key metrics and trends, comparison to previous period, areas of concern, and 3 recommended actions with expected impact."
  },
  {
    id: "communication",
    category: "communication",
    action: "Draft your next important email with AI assistance.",
    prompt: "I need to write a [TONE: professional/friendly/urgent] email to [RECIPIENT ROLE] about [TOPIC]. The goal is to [DESIRED OUTCOME]. Key points to include: [LIST]. Please draft this email with a clear call-to-action."
  },
  {
    id: "creative",
    category: "creative problem solving",
    action: "Brainstorm solutions to your current challenge.",
    prompt: "I'm facing this challenge: [DESCRIBE PROBLEM]. Context: [RELEVANT BACKGROUND]. Constraints: [LIMITATIONS]. Please generate 5 creative solutions, evaluating each for feasibility, impact, and implementation effort."
  },
  {
    id: "meetings",
    category: "meeting preparation",
    action: "Let AI prepare your next meeting agenda and talking points.",
    prompt: "I have a meeting about [TOPIC] with [PARTICIPANTS]. The objectives are: [LIST GOALS]. Please create: 1) A structured agenda with time allocations, 2) Key talking points for each item, 3) Potential questions to anticipate, 4) Suggested action items template."
  },
]

export const DEFAULT_PROMPT_PACKS: PromptPack[] = [
  {
    id: "email",
    title: "Email Mastery",
    icon: "MessageSquare",
    category: "Communication",
    description: "Draft, refine, and automate professional emails 3x faster.",
    prompts: [
      { name: "Cold Outreach", template: "Write a compelling cold email to [PROSPECT] at [COMPANY]. My value prop: [VALUE]. Goal: [MEETING/DEMO/CALL]. Keep it under 150 words, personalized, and include a clear CTA." },
      { name: "Follow-Up Sequence", template: "Create a 3-email follow-up sequence for [CONTEXT]. Email 1: Value reminder (2 days). Email 2: Social proof (5 days). Email 3: Last chance (10 days). Each under 100 words." },
      { name: "Difficult Conversation", template: "Help me write an email addressing [SENSITIVE ISSUE] with [RECIPIENT]. Tone: professional but empathetic. I need to: [OUTCOME]. Avoid: [PITFALLS]." },
    ]
  },
  {
    id: "research",
    title: "Research Power Pack",
    icon: "Brain",
    category: "Research & Analysis",
    description: "Turn hours of research into minutes with structured analysis prompts.",
    prompts: [
      { name: "Competitive Analysis", template: "Analyze [COMPETITOR] vs our company. Compare: pricing, features, market positioning, strengths, weaknesses. Format as a strategic brief with actionable insights." },
      { name: "Market Research Synthesis", template: "I have research from [SOURCES]. Synthesize into: 1) Key market trends, 2) Customer pain points, 3) Opportunities, 4) Risks, 5) Recommended actions." },
      { name: "Literature Review", template: "Summarize the key findings from these sources on [TOPIC]: [SOURCES]. Identify consensus points, contradictions, and gaps in the research." },
    ]
  },
  {
    id: "documents",
    title: "Document Creation",
    icon: "Zap",
    category: "Document Creation",
    description: "Create polished proposals, reports, and documentation instantly.",
    prompts: [
      { name: "Proposal Generator", template: "Create a proposal for [CLIENT] for [PROJECT]. Include: executive summary, scope, deliverables, timeline, pricing ($[AMOUNT]), and terms. Emphasize [KEY VALUE PROPS]." },
      { name: "Executive Summary", template: "Write an executive summary of this [DOCUMENT/DATA]. Target audience: [EXECUTIVES]. Key decisions needed: [DECISIONS]. Max 1 page, bullet points for key metrics." },
      { name: "SOW Template", template: "Draft a Statement of Work for [PROJECT]. Parties: [US] and [CLIENT]. Deliverables: [LIST]. Timeline: [DATES]. Success criteria: [METRICS]." },
    ]
  },
  {
    id: "meetings",
    title: "Meeting Accelerator",
    icon: "BookOpen",
    category: "Productivity",
    description: "Prepare, run, and follow up on meetings in half the time.",
    prompts: [
      { name: "Agenda Builder", template: "Create an agenda for [MEETING TYPE] with [PARTICIPANTS]. Duration: [TIME]. Goals: [OBJECTIVES]. Include time allocations and discussion questions for each item." },
      { name: "Meeting Notes to Actions", template: "Convert these meeting notes into: 1) Key decisions made, 2) Action items with owners and deadlines, 3) Open questions, 4) Next meeting topics. Notes: [PASTE]" },
      { name: "Pre-Meeting Brief", template: "Prepare me for a meeting with [PERSON/COMPANY]. Context: [BACKGROUND]. Their likely concerns: [ISSUES]. My objectives: [GOALS]. Give me talking points and questions to ask." },
    ]
  },
  {
    id: "creative",
    title: "Creative Ideation",
    icon: "Lightbulb",
    category: "Innovation",
    description: "Brainstorm solutions and generate creative approaches to problems.",
    prompts: [
      { name: "Problem Reframing", template: "Reframe this problem 5 different ways: [PROBLEM]. For each reframe, suggest a novel solution approach. Include at least one contrarian perspective." },
      { name: "Idea Expansion", template: "Take this initial idea: [IDEA]. Generate 10 variations ranging from conservative to radical. For each, note feasibility (1-5) and potential impact (1-5)." },
      { name: "Reverse Brainstorm", template: "How could we make [GOAL] fail completely? List 10 ways. Then reverse each into a success strategy with specific implementation steps." },
    ]
  },
]

// ─── Fetch settings from Firestore ────────────────────────────────────
export async function getPromptSettings(orgId: string): Promise<PromptSettings> {
  try {
    const settings = await getDocument<PromptSettings>(
      COLLECTIONS.SETTINGS,
      `prompts_${orgId}`
    )
    if (settings) {
      return {
        actionPrompts: settings.actionPrompts || DEFAULT_ACTION_PROMPTS,
        promptPacks: settings.promptPacks || DEFAULT_PROMPT_PACKS,
      }
    }
  } catch (err) {
    console.error("Failed to fetch prompt settings:", err)
  }
  return {
    actionPrompts: DEFAULT_ACTION_PROMPTS,
    promptPacks: DEFAULT_PROMPT_PACKS,
  }
}
