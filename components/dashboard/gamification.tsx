"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Trophy,
  Star,
  Rocket,
  Target,
  TrendingUp,
  Flame,
  Clock,
  Sparkles,
  Users,
  Building2,
  AlertTriangle,
  ChevronRight,
  Award,
  Zap,
  Calendar,
  Eye,
  MessageSquare,
} from "lucide-react"

// ── Skill Tier System ──────────────────────────────────────────────────
export type SkillTier = "explorer" | "practitioner" | "champion"

export interface TierRequirements {
  minMonths: number
  minAvgScore: number
}

export const TIER_CONFIG: Record<SkillTier, { 
  name: string
  icon: typeof Trophy
  color: string
  bgColor: string
  borderColor: string
  requirements: TierRequirements
  description: string
}> = {
  explorer: {
    name: "AI Explorer",
    icon: Rocket,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    requirements: { minMonths: 0, minAvgScore: 0 },
    description: "Beginning your AI journey",
  },
  practitioner: {
    name: "AI Practitioner",
    icon: Star,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    requirements: { minMonths: 2, minAvgScore: 6 },
    description: "Building consistent AI habits",
  },
  champion: {
    name: "AI Champion",
    icon: Trophy,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    requirements: { minMonths: 3, minAvgScore: 7 },
    description: "Leading the AI transformation",
  },
}

export function calculateTier(monthsActive: number, avgScore: number): SkillTier {
  if (monthsActive >= 3 && avgScore >= 7) return "champion"
  if (monthsActive >= 2 && avgScore >= 6) return "practitioner"
  return "explorer"
}

export function getNextTier(currentTier: SkillTier): SkillTier | null {
  if (currentTier === "explorer") return "practitioner"
  if (currentTier === "practitioner") return "champion"
  return null
}

export function SkillTierCard({
  monthsActive,
  avgScore,
  totalResponses,
}: {
  monthsActive: number
  avgScore: number
  totalResponses: number
}) {
  const currentTier = calculateTier(monthsActive, avgScore)
  const nextTier = getNextTier(currentTier)
  const tierConfig = TIER_CONFIG[currentTier]
  const TierIcon = tierConfig.icon

  // Calculate progress to next tier
  let progressPercent = 100
  let progressText = "You've reached the highest tier!"
  let monthsNeeded = 0
  let scoreNeeded = 0

  if (nextTier) {
    const nextConfig = TIER_CONFIG[nextTier]
    const monthsProgress = Math.min(monthsActive / nextConfig.requirements.minMonths, 1)
    const scoreProgress = Math.min(avgScore / nextConfig.requirements.minAvgScore, 1)
    progressPercent = Math.round(((monthsProgress + scoreProgress) / 2) * 100)
    
    monthsNeeded = Math.max(0, nextConfig.requirements.minMonths - monthsActive)
    scoreNeeded = Math.max(0, nextConfig.requirements.minAvgScore - avgScore)
    
    if (monthsNeeded > 0 && scoreNeeded > 0) {
      progressText = `${monthsNeeded} more month${monthsNeeded > 1 ? "s" : ""} and ${scoreNeeded.toFixed(1)} more points to ${nextConfig.name}`
    } else if (monthsNeeded > 0) {
      progressText = `${monthsNeeded} more month${monthsNeeded > 1 ? "s" : ""} to ${nextConfig.name}`
    } else if (scoreNeeded > 0) {
      progressText = `${scoreNeeded.toFixed(1)} more points to ${nextConfig.name}`
    }
  }

  return (
    <Card className={`relative overflow-hidden ${tierConfig.borderColor} ${tierConfig.bgColor}`}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-current opacity-5 blur-2xl" />
      <CardContent className="relative p-5">
        <div className="flex items-start gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${tierConfig.bgColor} ring-1 ${tierConfig.borderColor}`}>
            <TierIcon className={`h-7 w-7 ${tierConfig.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`text-lg font-bold ${tierConfig.color}`}>{tierConfig.name}</h3>
              <Badge variant="outline" className="text-[10px] h-5">
                {totalResponses} scorecards
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{tierConfig.description}</p>
            
            {nextTier && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-muted-foreground">Progress to {TIER_CONFIG[nextTier].name}</span>
                  <span className="text-[11px] font-medium text-foreground">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <p className="mt-1.5 text-[11px] text-muted-foreground">{progressText}</p>
              </div>
            )}
            
            {!nextTier && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <Trophy className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Top tier achieved!</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Personal Bests ─────────────────────────────────────────────────────
export interface PersonalBest {
  category: string
  score: number
  previousBest: number
  achievedDate: string
  isNew: boolean
}

export function PersonalBestsCard({ bests }: { bests: PersonalBest[] }) {
  const newBests = bests.filter((b) => b.isNew)
  const topBests = bests.slice(0, 4)

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Award className="h-4 w-4 text-amber-400" />
          Personal Bests
          {newBests.length > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 text-[9px] h-4 hover:bg-amber-500/20">
              {newBests.length} new!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex flex-col gap-2">
          {topBests.map((best) => (
            <div
              key={best.category}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                best.isNew 
                  ? "border-amber-500/30 bg-amber-500/10" 
                  : "border-border/50 bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {best.isNew && <Sparkles className="h-3.5 w-3.5 text-amber-400" />}
                <span className="text-sm text-foreground">{best.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{best.score.toFixed(1)}</span>
                {best.isNew && best.previousBest > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    (was {best.previousBest.toFixed(1)})
                  </span>
                )}
              </div>
            </div>
          ))}
          {topBests.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Complete scorecards to track your personal bests
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Department Rivalry Rankings ────────────────────────────────────────
export interface DepartmentRanking {
  department: string
  avgScore: number
  rank: number
  change: number // position change from last period
  participationRate: number
}

export function DepartmentRivalryCard({ 
  rankings,
  userDepartment,
}: { 
  rankings: DepartmentRanking[]
  userDepartment?: string
}) {
  const sortedRankings = [...rankings].sort((a, b) => a.rank - b.rank)

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4 text-primary" />
          Department Rankings
        </CardTitle>
        <CardDescription className="text-[11px]">
          See how your team compares
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex flex-col gap-2">
          {sortedRankings.slice(0, 5).map((dept) => {
            const isUserDept = dept.department === userDepartment
            const rankColor = dept.rank === 1 ? "text-amber-400" : dept.rank === 2 ? "text-slate-400" : dept.rank === 3 ? "text-amber-600" : "text-muted-foreground"
            
            return (
              <div
                key={dept.department}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  isUserDept
                    ? "border-primary/30 bg-primary/10"
                    : "border-border/50 bg-muted/30"
                }`}
              >
                <span className={`text-lg font-bold w-6 ${rankColor}`}>
                  #{dept.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {dept.department}
                    </span>
                    {isUserDept && (
                      <Badge variant="outline" className="text-[9px] h-4">You</Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {dept.participationRate}% participation
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">{dept.avgScore.toFixed(1)}</span>
                  {dept.change !== 0 && (
                    <div className={`text-[10px] ${dept.change > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {dept.change > 0 ? "+" : ""}{dept.change} rank
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ── "Someone in Your Cohort" Nudges ────────────────────────────────────
const COHORT_NUDGES = [
  { template: "Someone in {cohort} saved {hours} hours last week using AI for {task}.", tasks: ["document review", "email drafting", "data analysis", "meeting prep", "research synthesis"] },
  { template: "A {cohort} colleague improved their AI score by {points} points this month.", tasks: [] },
  { template: "Your {cohort} peers completed {count} scorecards this week.", tasks: [] },
  { template: "The top performer in {cohort} uses AI for {task} daily.", tasks: ["communication", "research", "planning", "creative work", "problem solving"] },
]

export function CohortNudgeCard({ 
  cohort = "your organization",
  hoursSaved = 12,
  pointsImproved = 1.2,
  scorecardsCompleted = 23,
}: { 
  cohort?: string
  hoursSaved?: number
  pointsImproved?: number
  scorecardsCompleted?: number
}) {
  const [nudgeIndex, setNudgeIndex] = useState(0)
  const [taskIndex, setTaskIndex] = useState(0)

  useEffect(() => {
    // Randomize on mount
    setNudgeIndex(Math.floor(Math.random() * COHORT_NUDGES.length))
    setTaskIndex(Math.floor(Math.random() * 5))
  }, [])

  const nudge = COHORT_NUDGES[nudgeIndex]
  const task = nudge.tasks.length > 0 ? nudge.tasks[taskIndex % nudge.tasks.length] : ""
  
  const message = nudge.template
    .replace("{cohort}", cohort)
    .replace("{hours}", String(hoursSaved))
    .replace("{points}", pointsImproved.toFixed(1))
    .replace("{count}", String(scorecardsCompleted))
    .replace("{task}", task)

  const nextNudge = () => {
    setNudgeIndex((prev) => (prev + 1) % COHORT_NUDGES.length)
    setTaskIndex((prev) => prev + 1)
  }

  return (
    <Card className="relative overflow-hidden border-cyan/20 bg-gradient-to-br from-cyan/5 via-card/80 to-card/80">
      <CardContent className="relative p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan/15 ring-1 ring-cyan/20">
            <Users className="h-4 w-4 text-cyan" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-cyan mb-1">
              Peer Insight
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {message}
            </p>
            <button
              onClick={nextNudge}
              className="mt-2 text-xs text-muted-foreground hover:text-cyan transition-colors"
            >
              Show another insight →
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Monthly Insight Reveal ─────────────────────────────────────────────
const INSIGHTS = [
  "People who score high on Meeting Efficiency also save 40% more time on Document Review.",
  "Users who complete scorecards consistently show 2x faster improvement than sporadic users.",
  "The highest scorers in Communication also lead in Creative Problem Solving.",
  "Early adopters (first 3 months) who hit 7+ average maintain that level 85% of the time.",
  "Teams with 80%+ participation have 35% higher average scores than those below 50%.",
  "Research & Analysis skills correlate strongly with Data & Reporting improvements.",
  "Users who engage with Prompt Packs improve 1.5x faster than those who don't.",
  "Morning scorecard completers score 8% higher on average than evening completers.",
]

export function MonthlyInsightCard({ 
  insightIndex,
  onReveal,
  revealed = false,
}: { 
  insightIndex?: number
  onReveal?: () => void
  revealed?: boolean
}) {
  const [showInsight, setShowInsight] = useState(revealed)
  const idx = insightIndex ?? Math.floor(Math.random() * INSIGHTS.length)
  const insight = INSIGHTS[idx % INSIGHTS.length]

  const handleReveal = () => {
    setShowInsight(true)
    onReveal?.()
  }

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card/80 to-card/80">
      <CardContent className="relative p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/20">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              Monthly Insight
            </p>
            {showInsight ? (
              <p className="mt-1 text-sm font-medium text-foreground leading-relaxed">
                "{insight}"
              </p>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground mb-3">
                  A data insight is waiting for you...
                </p>
                <Button size="sm" onClick={handleReveal}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Reveal Insight
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Streak At Risk Warning ─────────────────────────────────────────────
export function StreakAtRiskCard({ 
  currentStreak,
  daysUntilDeadline,
}: { 
  currentStreak: number
  daysUntilDeadline: number
}) {
  if (daysUntilDeadline > 7 || currentStreak === 0) return null

  const urgencyLevel = daysUntilDeadline <= 2 ? "critical" : daysUntilDeadline <= 5 ? "warning" : "info"
  
  const colors = {
    critical: { border: "border-red-500/30", bg: "bg-red-500/10", text: "text-red-400", icon: AlertTriangle },
    warning: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400", icon: Clock },
    info: { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400", icon: Flame },
  }

  const config = colors[urgencyLevel]
  const Icon = config.icon

  return (
    <Card className={`relative overflow-hidden ${config.border} ${config.bg}`}>
      <CardContent className="relative p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bg} ring-1 ${config.border}`}>
            <Icon className={`h-5 w-5 ${config.text}`} />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${config.text}`}>
              {urgencyLevel === "critical" 
                ? "Your streak is at risk!" 
                : urgencyLevel === "warning"
                  ? "Protect your streak"
                  : "Streak reminder"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {daysUntilDeadline === 1 
                ? "Complete your scorecard today to maintain your " 
                : `${daysUntilDeadline} days left to maintain your `}
              <span className="font-semibold text-foreground">{currentStreak}-week streak</span>
            </p>
          </div>
          <Button size="sm" variant="outline" className={config.border} asChild>
            <a href="/scorecard">
              Complete Now
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Next Scorecard Countdown ───────────────────────────────────────────
export function NextScorecardCountdown({ 
  daysUntilNext,
  lastCompletedDate,
}: { 
  daysUntilNext: number
  lastCompletedDate?: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        Next scorecard available in{" "}
        <span className="font-semibold text-foreground">{daysUntilNext} days</span>
      </span>
    </div>
  )
}

// ── Custom Goal Setting ────────────────────────────────────────────────
export interface UserGoal {
  id: string
  text: string
  targetValue: number
  currentValue: number
  targetDate: string
  category: "score" | "hours" | "streak" | "custom"
}

export function CustomGoalsCard({ 
  goals,
  onAddGoal,
  onUpdateGoal,
}: { 
  goals: UserGoal[]
  onAddGoal?: () => void
  onUpdateGoal?: (goalId: string, value: number) => void
}) {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-emerald-400" />
            My Goals
          </CardTitle>
          {onAddGoal && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAddGoal}>
              + Add Goal
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex flex-col gap-3">
          {goals.map((goal) => {
            const progress = Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100)
            const isComplete = progress >= 100
            
            return (
              <div key={goal.id} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{goal.text}</span>
                  {isComplete && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] h-4 hover:bg-emerald-500/20">
                      Complete!
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={progress} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {goal.currentValue} / {goal.targetValue}
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Target: {new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </p>
              </div>
            )
          })}
          {goals.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Set personal goals to track your AI journey
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Win of the Month ───────────────────────────────────────────────────
export function WinOfTheMonthCard({
  onSubmit,
  previousWins,
}: {
  onSubmit?: (win: string) => void
  previousWins?: { text: string; author: string; date: string }[]
}) {
  const [win, setWin] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (win.trim() && onSubmit) {
      onSubmit(win.trim())
      setSubmitted(true)
    }
  }

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-amber-400" />
          Win of the Month
        </CardTitle>
        <CardDescription className="text-[11px]">
          Share your best AI use case. Top wins get featured!
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        {!submitted ? (
          <div className="space-y-3">
            <textarea
              className="w-full rounded-lg border border-border/50 bg-background/50 p-3 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
              rows={3}
              placeholder="Describe your best AI win this month..."
              value={win}
              onChange={(e) => setWin(e.target.value)}
            />
            <Button size="sm" disabled={!win.trim()} onClick={handleSubmit}>
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Submit Win
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
            <p className="text-sm font-medium text-emerald-400">Thanks for sharing!</p>
            <p className="text-xs text-muted-foreground mt-1">Your win has been submitted for review.</p>
          </div>
        )}

        {previousWins && previousWins.length > 0 && (
          <div className="mt-4 border-t border-border/50 pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Featured Wins</p>
            {previousWins.slice(0, 2).map((w, idx) => (
              <div key={idx} className="rounded-lg bg-muted/30 p-3 mb-2 last:mb-0">
                <p className="text-sm text-foreground">"{w.text}"</p>
                <p className="text-[10px] text-muted-foreground mt-1">— {w.author}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
