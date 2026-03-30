"use client"

import { useState } from "react"
import Image from "next/image"
import { 
  Sparkles, 
  Brain, 
  Rocket, 
  Target, 
  Users, 
  Wrench,
  Calendar,
  TrendingUp,
  MessageSquare,
  Zap,
  Lightbulb,
  Clock,
  RefreshCcw,
  BookOpen,
  X,
  ExternalLink,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Category = "all" | "productivity" | "sales" | "leadership" | "mindset" | "tools"

interface PromptPack {
  id: string
  title: string
  subtitle: string
  description: string
  category: Category
  promptCount?: number
  icon: React.ElementType
  color: string
  image?: string
  prompts?: { title: string; prompt: string }[]
}

const promptPacks: PromptPack[] = [
  {
    id: "you-are-the-product",
    title: "You Are The Product Prompt Pack",
    subtitle: "Biases, Blind Spots, Binds, and Bottlenecks",
    description: "25 CRAFT-structured prompts across five categories — Biases, Blind Spots, Double Binds, Bottlenecks, and The Three E's — designed to surface what your current thinking is hiding.",
    category: "mindset",
    promptCount: 25,
    icon: Brain,
    color: "from-purple-500 to-pink-500",
    image: "/images/prompt-packs/you-are-the-product.jpg",
    prompts: [
      { title: "Confirmation Bias Check", prompt: "I'm working on [describe decision/project]. Help me identify where I might be seeking information that confirms what I already believe. What contradictory evidence should I be looking for?" },
      { title: "Blind Spot Scanner", prompt: "Analyze my approach to [situation] and identify potential blind spots I may have due to my role, experience, or perspective. What am I likely missing?" },
      { title: "Double Bind Detector", prompt: "I feel stuck between [option A] and [option B]. Help me identify if this is a false dichotomy and what third options might exist." },
      { title: "Bottleneck Finder", prompt: "Review my current workflow for [project/process] and identify where bottlenecks are likely forming. What's the constraint limiting throughput?" },
      { title: "Energy Audit", prompt: "Help me audit where my energy is going this week. What activities are energizing vs. draining? Where am I spending effort without return?" },
    ]
  },
  {
    id: "master-prompt-builder",
    title: "The Master Prompt Builder",
    subtitle: "Design Your AI Operating System",
    description: "Build your definitive AI operating system through a 10-section discovery process — your behavioral DNA, philosophy, voice, and current reality in one master prompt you can use with any AI.",
    category: "tools",
    icon: Wrench,
    color: "from-blue-500 to-cyan-500",
    image: "/images/prompt-packs/master-prompt-builder.jpg",
    prompts: [
      { title: "Section 1: Your Role & Context", prompt: "Let's define your professional context. Describe your role, responsibilities, industry, and the types of decisions you make regularly. What does a typical week look like?" },
      { title: "Section 2: Communication Style", prompt: "How do you prefer to communicate? Are you direct or diplomatic? Do you prefer bullet points or narratives? Formal or casual? Give examples of how you write emails or present ideas." },
      { title: "Section 3: Decision Framework", prompt: "Walk me through how you make important decisions. What factors do you weigh? What's your risk tolerance? How do you balance speed vs. thoroughness?" },
      { title: "Section 4: Values & Principles", prompt: "What are your non-negotiable principles in work? What values guide how you lead, collaborate, and create? What would you never compromise on?" },
      { title: "Section 5: Current Priorities", prompt: "What are your top 3 priorities right now? What does success look like for each? What obstacles are you facing?" },
    ]
  },
  {
    id: "ultimate-2026-planning",
    title: "The Ultimate 2026 Planning Prompt Pack",
    subtitle: "Design Your Best Year Yet",
    description: "Five sequential prompts to build a battle-tested, cascade-proof, AI-enabled vision — from crystal-clear destination to McKinsey stress test to executable roadmap.",
    category: "productivity",
    promptCount: 5,
    icon: Calendar,
    color: "from-green-500 to-emerald-500",
    image: "/images/prompt-packs/2026-planning.jpg",
    prompts: [
      { title: "Vision Crystallization", prompt: "It's December 31, 2026. You're reflecting on the year. What happened that made it your best year ever? Describe in vivid detail — professionally, personally, financially, and relationally." },
      { title: "Reverse Engineering", prompt: "Based on my 2026 vision, help me reverse-engineer the key milestones. What needs to be true by Q1, Q2, Q3, and Q4 for this vision to become reality?" },
      { title: "McKinsey Stress Test", prompt: "Challenge my 2026 plan with rigorous questions. Where are the assumptions weak? What market conditions could derail this? What's the Plan B?" },
      { title: "90-Day Sprint Design", prompt: "Design my Q1 2026 sprint. What are the 3 most important outcomes? What weekly rhythms will ensure progress? What do I need to stop doing?" },
      { title: "Accountability Architecture", prompt: "Help me design an accountability system for my 2026 goals. What metrics should I track? How often? Who should hold me accountable? What are my leading indicators?" },
    ]
  },
  {
    id: "meeting-mastery",
    title: "Meeting Mastery AI-Powered Prompt Pack",
    subtitle: "Transform Every Meeting Into High-Performance Collaboration",
    description: "AI-powered prompts for every meeting type you lead — from weekly leadership team meetings to crisis response sessions. Built on SHIFT's Meeting Mastery Framework.",
    category: "leadership",
    icon: Users,
    color: "from-amber-500 to-orange-500",
    image: "/images/prompt-packs/meeting-mastery.jpg",
    prompts: [
      { title: "Pre-Meeting Prep", prompt: "I have a [meeting type] in [timeframe] with [attendees]. Help me create an agenda that maximizes engagement and outcomes. What's the one thing this meeting must accomplish?" },
      { title: "Leadership Team Meeting", prompt: "Design a 60-minute leadership team meeting agenda focused on [topic]. Include check-in, strategic discussion, decision-making, and clear next steps with owners." },
      { title: "1:1 Meeting Guide", prompt: "I have a 1:1 with [team member] who is [context - new, struggling, high performer, etc.]. Create a conversation guide that balances support, accountability, and development." },
      { title: "Crisis Response Meeting", prompt: "We're facing [crisis situation]. Design a 30-minute crisis response meeting that ensures clarity on facts, aligned response, and clear communication plan." },
      { title: "Post-Meeting Summary", prompt: "Here are my notes from [meeting]: [paste notes]. Create a clear summary with decisions made, action items with owners and deadlines, and key discussion points." },
    ]
  },
  {
    id: "high-performance-flow",
    title: "The High Performance & Flow Prompt Pack",
    subtitle: "Rhythms, Rituals & Routines for Peak Performance",
    description: "14 prompts to design the takeoffs and landings — daily, weekly, monthly, and quarterly rhythms — that turn good intentions into sustained high performance.",
    category: "productivity",
    promptCount: 14,
    icon: Rocket,
    color: "from-violet-500 to-purple-500",
    image: "/images/prompt-packs/high-performance.jpg",
    prompts: [
      { title: "Morning Ritual Design", prompt: "Design a morning ritual for me that takes [X minutes] and optimizes for [energy/focus/creativity]. Consider my context: [work schedule, family situation, etc.]" },
      { title: "Weekly Review Template", prompt: "Create a weekly review template I can complete in 20 minutes that captures wins, lessons, and sets up next week for success." },
      { title: "Deep Work Blocks", prompt: "Help me design my ideal deep work schedule. I have [available hours] and my most cognitively demanding work is [describe]. When should I block time and how should I protect it?" },
      { title: "Energy Management Map", prompt: "Help me map my energy patterns. When am I typically highest energy? When do I crash? How can I align my most important work with my peak energy?" },
      { title: "Quarterly Reset", prompt: "Guide me through a quarterly reset. What should I celebrate from last quarter? What should I let go of? What's the theme and top 3 priorities for next quarter?" },
    ]
  },
  {
    id: "building-agents",
    title: "Building Agents Guide",
    subtitle: "5 Easy to Build, High Impact Starter Agents",
    description: "Complete Copilot Studio instructions for 5 starter agents: Meeting Prep Assistant, Email Composer, Renewal Summary Builder, Follow-Up Generator, and Weekly Priority Planner. Each builds in about 5 minutes.",
    category: "tools",
    promptCount: 5,
    icon: Zap,
    color: "from-blue-500 to-indigo-500",
    image: "/images/prompt-packs/building-agents.jpg",
    prompts: [
      { title: "Meeting Prep Agent", prompt: "You are a Meeting Prep Assistant. When given a meeting topic and attendees, you: 1) Research attendee backgrounds, 2) Suggest agenda items, 3) Prepare talking points, 4) Identify potential questions to anticipate." },
      { title: "Email Composer Agent", prompt: "You are an Email Composer. Given the context, recipient, and desired outcome, you draft professional emails matching the user's voice. Always offer 3 versions: concise, standard, and detailed." },
      { title: "Renewal Summary Builder", prompt: "You are a Renewal Summary Builder. Given customer data and history, you create executive summaries highlighting value delivered, usage trends, expansion opportunities, and renewal recommendations." },
      { title: "Follow-Up Generator", prompt: "You are a Follow-Up Generator. After any meeting or call, you create personalized follow-up messages that reference specific discussion points, confirm next steps, and maintain momentum." },
      { title: "Weekly Priority Planner", prompt: "You are a Weekly Priority Planner. Given goals, calendar, and current projects, you help prioritize the week's tasks, identify conflicts, and suggest optimal scheduling." },
    ]
  },
  {
    id: "leader-manager",
    title: "Leader & Manager Prompt Pack",
    subtitle: "50 AI Prompts Across 10 Leadership Responsibilities",
    description: "50 prompts organized around the 10 core responsibilities that define the leader-manager role: coaching, performance, onboarding, training, feedback, difficult conversations, goal setting, delegation, hiring, and culture.",
    category: "leadership",
    promptCount: 50,
    icon: Target,
    color: "from-rose-500 to-pink-500",
    image: "/images/prompt-packs/leader-manager.jpg",
    prompts: [
      { title: "Coaching Conversation", prompt: "I need to have a coaching conversation with [team member] about [topic]. They are [context]. Help me structure a conversation that's supportive but drives accountability." },
      { title: "Performance Review Prep", prompt: "Help me prepare a performance review for [team member]. Their key accomplishments: [list]. Areas for growth: [list]. Create a balanced review that motivates continued excellence." },
      { title: "Onboarding 30-60-90", prompt: "Create a 30-60-90 day onboarding plan for a new [role] joining my team. What should they learn, who should they meet, and what quick wins should they target?" },
      { title: "Difficult Conversation Script", prompt: "I need to have a difficult conversation with [person] about [issue]. Help me script an opening that's direct but compassionate, and anticipate their likely responses." },
      { title: "Delegation Framework", prompt: "I need to delegate [task/project] to [team member]. Help me create a clear delegation brief including context, expectations, authority level, and check-in schedule." },
    ]
  },
  {
    id: "sales-business-dev",
    title: "Sales & Business Development Prompt Pack",
    subtitle: "Thought Leadership, Content, Outreach & Inbound",
    description: "30 prompts for building thought leadership, multiplying content, researching prospects, and starting real conversations at scale. Built around inbound logic.",
    category: "sales",
    promptCount: 30,
    icon: TrendingUp,
    color: "from-emerald-500 to-teal-500",
    image: "/images/prompt-packs/sales-business-dev.jpg",
    prompts: [
      { title: "Prospect Research Deep Dive", prompt: "Research [company name] for an upcoming sales conversation. What are their recent news, challenges, competitors, and likely priorities? What questions should I ask?" },
      { title: "LinkedIn Outreach Sequence", prompt: "Create a 3-touch LinkedIn outreach sequence for [target persona] at [company type]. Focus on providing value, not pitching. Make it feel personal, not templated." },
      { title: "Thought Leadership Post", prompt: "Help me write a LinkedIn post about [topic] that positions me as a thought leader. It should be insightful, slightly contrarian, and invite engagement. Keep it under 200 words." },
      { title: "Content Multiplier", prompt: "I have this piece of content: [paste content]. Help me repurpose it into 5 different formats: LinkedIn post, email newsletter snippet, Twitter thread, slide deck outline, and video script." },
      { title: "Discovery Call Questions", prompt: "I have a discovery call with [prospect type]. Give me 10 great questions that uncover their real pain points, decision process, and timeline without feeling like an interrogation." },
    ]
  },
  {
    id: "getting-unstuck",
    title: "Getting Unstuck",
    subtitle: "The War of Art: Defeating Resistance",
    description: "Based on Steven Pressfield's framework, these 18 prompts help you name Resistance, turn pro, and use fear as a compass toward the work that matters most.",
    category: "mindset",
    promptCount: 18,
    icon: Lightbulb,
    color: "from-yellow-500 to-amber-500",
    image: "/images/prompt-packs/getting-unstuck.jpg",
    prompts: [
      { title: "Name the Resistance", prompt: "I'm procrastinating on [task/project]. Help me identify what form Resistance is taking. Is it fear of failure? Fear of success? Perfectionism? Something else?" },
      { title: "Fear as Compass", prompt: "What am I most afraid of doing right now professionally? Help me explore why that fear might be pointing toward exactly what I should be doing." },
      { title: "Turn Pro Today", prompt: "What would it look like to 'turn pro' on [project/goal] starting today? What amateur behaviors do I need to drop? What professional habits do I need to adopt?" },
      { title: "Resistance Inventory", prompt: "Help me do a Resistance inventory. What projects am I avoiding? What conversations am I not having? What decisions am I delaying? What patterns do you see?" },
      { title: "The Work vs. The Shadow", prompt: "Help me distinguish between 'the work' (what I'm truly called to do) and 'the shadow' (what looks like work but is actually avoidance). What am I spending time on that feels productive but isn't?" },
    ]
  },
  {
    id: "microsoft-365-copilot",
    title: "Microsoft 365 Copilot Quick Reference",
    subtitle: "Start Prompts with Clear Context, Purpose & Tone",
    description: "20 ready-to-use prompts for Agent Mode, Outlook, SharePoint, Copilot Voice, and Meeting Prep. The fastest way to get value from Microsoft 365 Copilot.",
    category: "tools",
    promptCount: 20,
    icon: MessageSquare,
    color: "from-blue-600 to-blue-400",
    image: "/images/prompt-packs/microsoft-365.jpg",
    prompts: [
      { title: "Outlook: Email Summary", prompt: "Summarize this email thread and highlight any action items assigned to me. What decisions need to be made?" },
      { title: "Outlook: Draft Reply", prompt: "Draft a professional reply to this email that [accepts/declines/requests more info]. Keep it concise and maintain a [formal/friendly] tone." },
      { title: "Teams: Meeting Recap", prompt: "Create a summary of this meeting including key decisions, action items with owners, and any unresolved questions that need follow-up." },
      { title: "Word: Document Summary", prompt: "Summarize this document in 3 bullet points. What are the key takeaways someone needs to know before a meeting about this?" },
      { title: "SharePoint: Find Information", prompt: "Search our SharePoint for documents related to [topic] from the last [timeframe]. Summarize what you find and highlight the most relevant sources." },
    ]
  },
  {
    id: "ai-sales-boost",
    title: "The AI Sales Boost Prompt Pack",
    subtitle: "Stop Wasting Time. Build Trust. Close the Right Deals.",
    description: "Use AI as your thinking partner to find better prospects, write outreach that gets opened, and run cleaner sales cycles.",
    category: "sales",
    icon: TrendingUp,
    color: "from-green-600 to-emerald-400",
    image: "/images/prompt-packs/ai-sales-boost.jpg",
    prompts: [
      { title: "Ideal Customer Profile Refinement", prompt: "Based on my best customers [describe them], help me refine my ideal customer profile. What patterns do you see? What characteristics predict success?" },
      { title: "Objection Handler", prompt: "The most common objection I hear is [objection]. Help me understand the real concern behind it and give me 3 ways to address it that build trust rather than overcome resistance." },
      { title: "Deal Qualification", prompt: "Help me qualify this opportunity: [describe deal]. Using MEDDIC or similar framework, what questions should I be asking? What red flags should I watch for?" },
      { title: "Competitive Positioning", prompt: "My prospect is also talking to [competitor]. Help me understand our key differentiators and how to position against them without badmouthing. What questions expose their weaknesses?" },
      { title: "Proposal Review", prompt: "Review this proposal: [paste proposal]. Is it focused on customer outcomes or our features? What's missing? How can I make the ROI more compelling?" },
    ]
  },
  {
    id: "capacity-map",
    title: "My Capacity Map",
    subtitle: "Your Interactive AI Capacity Planner",
    description: "An interactive worksheet to baseline your time, calculate what AI can reclaim, and plan your first three capacity-building projects. Export as a branded PDF.",
    category: "tools",
    icon: Clock,
    color: "from-indigo-500 to-violet-500",
    image: "/images/prompt-packs/capacity-map.jpg",
    prompts: [
      { title: "Time Audit", prompt: "Help me audit how I spend my time in a typical week. Ask me about my recurring meetings, admin tasks, creative work, and reactive vs. proactive time." },
      { title: "AI Opportunity Scanner", prompt: "Based on my time audit, identify tasks that AI could handle or accelerate. Categorize them by: fully automatable, AI-assisted, and still requires human judgment." },
      { title: "Capacity Reclaim Calculator", prompt: "If I implemented AI assistance for [tasks], estimate how many hours per week I could reclaim. What would be the realistic ramp-up time?" },
      { title: "First Three Projects", prompt: "Based on my capacity opportunities, help me prioritize my first three AI implementation projects. Consider impact, effort, and learning curve." },
      { title: "Reinvestment Plan", prompt: "If I reclaim [X hours] per week, help me plan how to reinvest that time. What high-value activities should get more of my attention?" },
    ]
  },
  {
    id: "building-capacity",
    title: "Building Capacity Prompt Pack",
    subtitle: "Reclaim Your Time, Redesign Your Role",
    description: "Map where your time goes, redistribute what AI reclaims, and build the projects that future-proof your role.",
    category: "productivity",
    icon: Clock,
    color: "from-teal-500 to-cyan-500",
    image: "/images/prompt-packs/building-capacity.jpg",
    prompts: [
      { title: "Role Evolution Map", prompt: "Help me map how my role could evolve with AI. What parts of my job are most susceptible to AI? What uniquely human skills should I double down on?" },
      { title: "Delegation to AI", prompt: "I want to delegate [task] to AI. Help me create a system: What inputs does the AI need? What's the quality check process? How do I handle exceptions?" },
      { title: "Capacity Dashboard", prompt: "Help me design a personal capacity dashboard. What metrics should I track to know if I'm spending time on the right things? How do I measure AI ROI?" },
      { title: "Future-Proof Skills", prompt: "Based on trends in [my industry/role], what skills should I be developing that AI won't replace? Create a 6-month skill development plan." },
      { title: "Weekly Capacity Review", prompt: "Guide me through a weekly capacity review. Where did I lose time this week? Where did AI help? What should I adjust for next week?" },
    ]
  },
  {
    id: "annual-reset",
    title: "The Annual Reset Prompt Pack",
    subtitle: "From Regret to Reset in 60 Minutes",
    description: "Excavate the lessons of the past year, define what actually matters next, and build a strategic blueprint that connects your regrets to your reset.",
    category: "productivity",
    icon: RefreshCcw,
    color: "from-orange-500 to-red-500",
    image: "/images/prompt-packs/annual-reset.jpg",
    prompts: [
      { title: "Year in Review", prompt: "Guide me through a comprehensive year in review. What were my biggest wins? Biggest disappointments? What surprised me? What patterns do I see?" },
      { title: "Regret Mining", prompt: "Help me mine my regrets from this year productively. What do they reveal about my values? What would I do differently? What lessons must I carry forward?" },
      { title: "Letting Go Ceremony", prompt: "What do I need to let go of from this year? Help me identify beliefs, habits, relationships, or commitments that are no longer serving me." },
      { title: "Values Clarification", prompt: "Based on this year's experiences, help me clarify my core values. Where did I feel most alive? Most compromised? What does this tell me about what matters?" },
      { title: "Reset Blueprint", prompt: "Help me create a reset blueprint for next year. Based on my regrets and lessons, what are the 3 things that would make next year dramatically better?" },
    ]
  },
]

const categories: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "productivity", label: "Productivity" },
  { value: "sales", label: "Sales" },
  { value: "leadership", label: "Leadership" },
  { value: "mindset", label: "Mindset" },
  { value: "tools", label: "Tools" },
]

function getCategoryColor(category: Category): string {
  switch (category) {
    case "productivity": return "bg-green-500/10 text-green-400 border-green-500/20"
    case "sales": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    case "leadership": return "bg-amber-500/10 text-amber-400 border-amber-500/20"
    case "mindset": return "bg-purple-500/10 text-purple-400 border-purple-500/20"
    case "tools": return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    default: return "bg-muted text-muted-foreground"
  }
}

export default function PromptPacksPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPack, setSelectedPack] = useState<PromptPack | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)

  const filteredPacks = promptPacks.filter((pack) => {
    const matchesCategory = selectedCategory === "all" || pack.category === selectedCategory
    const matchesSearch = 
      pack.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pack.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedPrompt(id)
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          SHIFT Prompt Pack Hub
        </h1>
        <p className="mt-2 text-muted-foreground">
          Curated AI prompts to accelerate your productivity, leadership, and growth
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                selectedCategory === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search prompt packs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">More packs added regularly.</span>{" "}
          Click on any pack to explore the prompts and copy them directly to use with your favorite AI assistant.
        </p>
      </div>

      {/* Prompt Pack Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPacks.map((pack) => {
          const Icon = pack.icon
          return (
            <button
              key={pack.id}
              onClick={() => setSelectedPack(pack)}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Header Image or Gradient */}
              <div className={cn(
                "relative h-32 w-full bg-gradient-to-br",
                pack.color
              )}>
                {pack.image ? (
                  <Image
                    src={pack.image}
                    alt={pack.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="h-16 w-16 text-white/30" />
                  </div>
                )}
                {/* Icon overlay */}
                <div className={cn(
                  "absolute bottom-3 left-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br shadow-lg",
                  pack.color
                )}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-4">
                {/* Category Badge */}
                <Badge 
                  variant="outline" 
                  className={cn("mb-2 w-fit capitalize", getCategoryColor(pack.category))}
                >
                  {pack.category}
                </Badge>

                {/* Title */}
                <h3 className="mb-1 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {pack.title}
                </h3>

                {/* Subtitle */}
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {pack.subtitle}
                </p>

                {/* Description */}
                <p className="mb-3 flex-1 text-xs text-muted-foreground/80 line-clamp-2">
                  {pack.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  {pack.promptCount && (
                    <span className="text-xs text-muted-foreground">
                      {pack.promptCount} prompts
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open Pack <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {filteredPacks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No prompt packs found matching your criteria</p>
        </div>
      )}

      {/* Pack Detail Dialog */}
      <Dialog open={!!selectedPack} onOpenChange={() => setSelectedPack(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {selectedPack && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                    selectedPack.color
                  )}>
                    <selectedPack.icon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <Badge 
                      variant="outline" 
                      className={cn("mb-2 capitalize", getCategoryColor(selectedPack.category))}
                    >
                      {selectedPack.category}
                    </Badge>
                    <DialogTitle className="text-xl">{selectedPack.title}</DialogTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedPack.subtitle}</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-4">
                <p className="text-sm text-muted-foreground">{selectedPack.description}</p>
              </div>

              {selectedPack.prompts && selectedPack.prompts.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Sample Prompts</h4>
                  {selectedPack.prompts.map((prompt, index) => (
                    <div 
                      key={index}
                      className="rounded-lg border border-border bg-muted/30 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h5 className="font-medium text-foreground">{prompt.title}</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(prompt.prompt, `${selectedPack.id}-${index}`)}
                          className="h-8 text-xs"
                        >
                          {copiedPrompt === `${selectedPack.id}-${index}` ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{prompt.prompt}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button variant="outline" onClick={() => setSelectedPack(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
