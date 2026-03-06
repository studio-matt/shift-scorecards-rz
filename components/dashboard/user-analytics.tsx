"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  ReferenceDot,
} from "recharts"
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Clock,
  DollarSign,
  Sparkles,
  BookOpen,
  Hand,
  Rocket,
  Zap,
  Brain,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import type {
  UserPersonalStreak,
  PersonalTrendPoint,
  PersonalVsBenchmark,
} from "@/lib/dashboard-data"

// ── "Your AI Journey" Hero Section ─────────────────────────────────────
export function AIJourneyHero({
  hoursSaved,
  dollarValue,
  startScore,
  currentScore,
  fieldAverage,
  percentile,
  cohortCount = 10,
}: {
  hoursSaved: number
  dollarValue: number
  startScore: number
  currentScore: number
  fieldAverage: number
  percentile: number
  cohortCount?: number
}) {
  const weeksEquivalent = Math.round(hoursSaved / 40 * 10) / 10
  const scoreGrowth = currentScore - startScore
  const vsField = currentScore - fieldAverage

  // Determine impact statement
  let impactStatement = ""
  if (hoursSaved >= 80) {
    impactStatement = `That's ${weeksEquivalent} full work weeks reclaimed.`
  } else if (hoursSaved >= 40) {
    impactStatement = "That's more than a full work week."
  } else if (hoursSaved >= 20) {
    impactStatement = "That's nearly half a work week."
  } else if (hoursSaved >= 8) {
    impactStatement = "That's a full work day reclaimed."
  } else {
    impactStatement = "You're just getting started."
  }

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-cyan/10 blur-3xl" />
      <CardContent className="relative p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {/* Left: Hours Saved Hero */}
          <div className="flex flex-col justify-center">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Your AI Journey</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tight text-foreground md:text-6xl">{hoursSaved}</span>
              <span className="text-xl text-muted-foreground">hours saved</span>
            </div>
            <p className="mt-2 text-lg text-muted-foreground">{impactStatement}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 w-fit">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              <span className="text-2xl font-bold text-emerald-400">${dollarValue.toLocaleString()}</span>
              <span className="text-sm text-emerald-400/80">in reclaimed capacity</span>
            </div>
          </div>

          {/* Right: Score Journey + Percentile */}
          <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card/50 p-4">
            {/* Score Trend Summary */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Score Journey</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl font-semibold text-muted-foreground">{startScore.toFixed(1)}</span>
                <ArrowRight className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold text-foreground">{currentScore.toFixed(1)}</span>
                {scoreGrowth !== 0 && (
                  <Badge className={`ml-2 ${scoreGrowth > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {scoreGrowth > 0 ? "+" : ""}{scoreGrowth.toFixed(1)}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Field average: <span className="font-semibold text-foreground">{fieldAverage.toFixed(1)}</span>
                {vsField !== 0 && (
                  <span className={vsField > 0 ? "text-emerald-400" : "text-amber-400"}>
                    {" "}({vsField > 0 ? "+" : ""}{vsField.toFixed(1)})
                  </span>
                )}
              </p>
            </div>

            {/* Percentile Rank */}
            <div className="border-t border-border/50 pt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Ranking</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">Top {100 - percentile}%</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                of all participants across {cohortCount} cohorts
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Percentile Distribution Curve ──────────────────────────────────────
export function PercentileDistribution({
  percentile,
  cohortCount = 10,
  totalParticipants = 850,
}: {
  percentile: number
  cohortCount?: number
  totalParticipants?: number
}) {
  // Generate bell curve data points
  const bellCurveData = Array.from({ length: 101 }, (_, i) => {
    const x = i
    const mean = 50
    const stdDev = 15
    const y = Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)))
    return { percentile: x, density: y * 100 }
  })

  const userPosition = percentile
  const userDensity = bellCurveData[userPosition]?.density ?? 0

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-primary" />
          Your Percentile Ranking
        </CardTitle>
        <CardDescription className="text-[11px]">
          Where you stand among {totalParticipants.toLocaleString()} participants across {cohortCount} cohorts
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-foreground">
              Top {100 - percentile}%
            </p>
            <p className="text-xs text-muted-foreground">
              {percentile >= 75 ? "Elite performer" : percentile >= 50 ? "Above average" : percentile >= 25 ? "Building momentum" : "Room to grow"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-primary">{percentile}th</p>
            <p className="text-xs text-muted-foreground">percentile</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={bellCurveData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="bellGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="density"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#bellGradient)"
            />
            <ReferenceLine
              x={userPosition}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            <ReferenceDot
              x={userPosition}
              y={userDensity}
              r={6}
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>0th percentile</span>
          <span>50th</span>
          <span>100th percentile</span>
        </div>

        {percentile >= 75 && (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-center">
            <p className="text-xs font-medium text-emerald-400">
              You're in the top quartile! Keep pushing forward.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── SVG Progress Ring helper ───────────────────────────────────────────
function ProgressRing({
  value,
  max,
  size = 100,
  strokeWidth = 8,
  color = "hsl(var(--primary))",
  trackColor = "hsl(var(--muted))",
  children,
}: {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  children?: React.ReactNode
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / max, 1)
  const offset = circumference * (1 - progress)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

// ── Flame intensity helper ─────────────────────────────────────────────
function FlameStack({ streak }: { streak: number }) {
  const intensity =
    streak >= 8 ? 4 :
    streak >= 4 ? 3 :
    streak >= 2 ? 2 :
    streak >= 1 ? 1 : 0

  const colors = [
    "text-muted-foreground/30",
    "text-amber-400",
    "text-orange-500",
    "text-orange-600",
    "text-red-500",
  ]

  return (
    <div className="flex items-end gap-0.5">
      {[0, 1, 2, 3].map((i) => (
        <Flame
          key={i}
          className={`transition-all duration-300 ${
            i < intensity ? colors[intensity] : "text-muted-foreground/10"
          }`}
          style={{
            height: 12 + i * 4,
            width: 12 + i * 4,
            opacity: i < intensity ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  )
}

// ── Personal Streak Card (visual ring + flame) ─────────────────────────
export function PersonalStreakCard({ data }: { data: UserPersonalStreak }) {
  const hasActivity = data.totalResponses > 0
  const responseRate = data.totalWeeks > 0
    ? Math.round((data.totalResponses / data.totalWeeks) * 100)
    : 0

  // Encouraging onboarding state
  if (!hasActivity) {
    return (
      <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
        <CardContent className="relative flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/20">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Your AI Journey Starts Here
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete your first scorecard to see your streak, benchmarks, and personalized insights.
            </p>
          </div>
          <Button size="sm" variant="default" className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20" asChild>
            <a href="/scorecard">Take Your First Scorecard</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const streakColor =
    data.currentStreak >= 8 ? "#ef4444" :
    data.currentStreak >= 4 ? "#f97316" :
    data.currentStreak >= 2 ? "#f59e0b" :
    "hsl(var(--muted-foreground))"

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Flame className="h-4 w-4" style={{ color: streakColor }} />
            Response Streak
          </span>
          <FlameStack streak={data.currentStreak} />
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-center gap-5">
          <ProgressRing
            value={data.currentStreak}
            max={Math.max(data.maxStreak, 12)}
            size={88}
            strokeWidth={7}
            color={streakColor}
          >
            <div className="text-center">
              <p className="text-2xl font-bold leading-none text-foreground">{data.currentStreak}</p>
              <p className="text-[9px] text-muted-foreground">weeks</p>
            </div>
          </ProgressRing>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border px-3 py-2">
                <p className="text-lg font-bold text-foreground">{data.maxStreak}</p>
                <p className="text-[10px] text-muted-foreground">Personal Best</p>
              </div>
              <div className="rounded-md border border-border px-3 py-2">
                <p className="text-lg font-bold text-foreground">{responseRate}%</p>
                <p className="text-[10px] text-muted-foreground">Response Rate</p>
              </div>
            </div>
            {data.currentStreak >= 2 && (
              <div className="mt-2 rounded-md px-3 py-1.5" style={{ backgroundColor: `${streakColor}10` }}>
                <p className="text-[11px] font-medium" style={{ color: streakColor }}>
                  {data.currentStreak >= 8
                    ? "Legendary streak! You're in the top tier."
                    : data.currentStreak >= 4
                    ? "On fire! Keep the momentum going."
                    : "Building consistency. One more week!"}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── You vs. Benchmark Card (3 reference points) ────────────────────────
export function PersonalBenchmarkCard({
  data,
  fieldAverage,
  monthlyGoal,
  lastMonthAvg,
}: {
  data: PersonalVsBenchmark
  fieldAverage?: number
  monthlyGoal?: number
  lastMonthAvg?: number
}) {
  const VelocityIcon =
    data.myVelocity > 0.1 ? TrendingUp :
    data.myVelocity < -0.1 ? TrendingDown :
    Minus

  const velocityColor =
    data.myVelocity > 0.1 ? "text-emerald-600" :
    data.myVelocity < -0.1 ? "text-red-500" :
    "text-muted-foreground"

  const velocityLabel =
    data.myVelocity > 0.1 ? "Improving" :
    data.myVelocity < -0.1 ? "Declining" :
    "Steady"

  const goal = monthlyGoal ?? 8.0
  const field = fieldAverage ?? 6.2
  const lastMonth = lastMonthAvg ?? (data.myAvg - data.myVelocity * 4)

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-primary" />
          Your Score in Context
        </CardTitle>
        <CardDescription className="text-[11px]">
          How you compare across three key reference points
        </CardDescription>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-4">
        {/* Primary score */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-primary bg-primary/10">
            <span className="text-2xl font-bold text-primary">{data.myAvg}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Your Average</p>
            <div className="mt-1 flex items-center gap-2">
              <VelocityIcon className={`h-3.5 w-3.5 ${velocityColor}`} />
              <span className={`text-xs font-medium ${velocityColor}`}>
                {velocityLabel} ({data.myVelocity > 0 ? "+" : ""}{data.myVelocity} pts/wk)
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-foreground">{data.percentile}<span className="text-xs text-muted-foreground">th</span></p>
            <p className="text-[10px] text-muted-foreground">percentile</p>
          </div>
        </div>

        {/* 3 reference bars */}
        <div className="flex flex-col gap-2">
          {[
            { label: "vs. Field Average", ref: field, description: "Industry benchmark across all SHIFT clients" },
            { label: "vs. Last Month", ref: Math.round(lastMonth * 10) / 10, description: "Your score last period" },
            { label: "vs. My Goal", ref: goal, description: "Your target score" },
          ].map((item) => {
            const diff = data.myAvg - item.ref
            const isAbove = diff >= 0
            return (
              <div key={item.label} className="rounded-md border border-border px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{item.ref}</span>
                    <Badge
                      variant={isAbove ? "default" : "secondary"}
                      className={`text-[10px] h-5 ${isAbove ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400"}`}
                    >
                      {isAbove ? "+" : ""}{diff.toFixed(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Dept & Org context */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{data.deptAvg}</p>
            <p className="text-[10px] text-muted-foreground">{data.deptName} Avg</p>
          </div>
          <div className="rounded-md border border-border p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{data.orgAvg}</p>
            <p className="text-[10px] text-muted-foreground">Company Avg</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Hours Saved Card ───────────────────────────────────────────────────
export function HoursSavedCard({
  totalResponses,
  hoursPerResponse = 1.5,
  hourlyRate = 125,
}: {
  totalResponses: number
  hoursPerResponse?: number
  hourlyRate?: number
}) {
  const hoursSaved = Math.round(totalResponses * hoursPerResponse * 10) / 10
  const dollarValue = Math.round(hoursSaved * hourlyRate)

  if (totalResponses === 0) return null

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-emerald-500/10 blur-xl" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-emerald-400" />
          Your Hours Saved
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-end gap-4">
          <div>
            <p className="text-3xl font-bold text-foreground">{hoursSaved}<span className="text-lg text-muted-foreground"> hrs</span></p>
            <p className="text-xs text-muted-foreground">this quarter</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {dollarValue.toLocaleString()}
              </span>
            </div>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500">
              at ${hourlyRate}/hr reclaimed capacity
            </p>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${Math.min((hoursSaved / 100) * 100, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Based on {totalResponses} completed scorecards with avg {hoursPerResponse}hr AI workflow improvement per session.
        </p>
      </CardContent>
    </Card>
  )
}

// ── High Fives Received ────────────────────────────────────────────────
export function HighFivesReceivedCard({
  count,
  recentFrom,
}: {
  count: number
  recentFrom?: string[]
}) {
  if (count === 0) return null

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent" />
      <CardContent className="relative flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/20">
          <Hand className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{count}</p>
          <p className="text-xs text-muted-foreground">
            High Fives received this month
          </p>
          {recentFrom && recentFrom.length > 0 && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Recently from {recentFrom.slice(0, 3).join(", ")}
              {recentFrom.length > 3 && ` +${recentFrom.length - 3} more`}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── AI Action Plan with Prompt Templates ───────────────────────────────
const ACTION_PROMPTS: Record<string, { action: string; prompt: string }> = {
  "document creation": {
    action: "Try using Claude to draft your next proposal from scratch.",
    prompt: "I need to write a [TYPE] proposal for [CLIENT/PROJECT]. The key points to cover are: [LIST KEY POINTS]. Please draft a professional proposal that emphasizes [VALUE PROPOSITION]. Include an executive summary, scope of work, timeline, and pricing structure."
  },
  "research & analysis": {
    action: "Let AI help you synthesize research findings faster.",
    prompt: "I have research data on [TOPIC] from [SOURCES]. Please analyze this information and provide: 1) Key themes and patterns, 2) Contradictions or gaps, 3) Actionable recommendations, 4) Questions for further research."
  },
  "data & reporting": {
    action: "Use AI to turn raw data into executive summaries.",
    prompt: "Here is my [TYPE] data: [PASTE DATA]. Please create an executive summary that includes: key metrics and trends, comparison to previous period, areas of concern, and 3 recommended actions with expected impact."
  },
  "communication": {
    action: "Draft your next important email with AI assistance.",
    prompt: "I need to write a [TONE: professional/friendly/urgent] email to [RECIPIENT ROLE] about [TOPIC]. The goal is to [DESIRED OUTCOME]. Key points to include: [LIST]. Please draft this email with a clear call-to-action."
  },
  "creative problem solving": {
    action: "Brainstorm solutions to your current challenge.",
    prompt: "I'm facing this challenge: [DESCRIBE PROBLEM]. Context: [RELEVANT BACKGROUND]. Constraints: [LIMITATIONS]. Please generate 5 creative solutions, evaluating each for feasibility, impact, and implementation effort."
  },
  "meeting preparation": {
    action: "Let AI prepare your next meeting agenda and talking points.",
    prompt: "I have a meeting about [TOPIC] with [PARTICIPANTS]. The objectives are: [LIST GOALS]. Please create: 1) A structured agenda with time allocations, 2) Key talking points for each item, 3) Potential questions to anticipate, 4) Suggested action items template."
  },
  "default": {
    action: "Start with a structured prompt for any task.",
    prompt: "I need help with [TASK]. Here's the context: [BACKGROUND]. My goal is to [DESIRED OUTCOME]. Please provide: 1) A step-by-step approach, 2) Key considerations, 3) Potential pitfalls to avoid, 4) A template or framework I can use."
  }
}

export function AIActionPlanCard({
  weakCategories,
  score,
}: {
  weakCategories: { category: string; score: number; suggestion: string }[]
  score: number
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const planItems = weakCategories.length > 0
    ? weakCategories.slice(0, 3)
    : [
        { category: "Getting Started", score: 0, suggestion: "Complete your first scorecard to receive a personalized AI action plan." },
      ]

  const getPromptForCategory = (category: string) => {
    const key = Object.keys(ACTION_PROMPTS).find(k => 
      category.toLowerCase().includes(k) || k.includes(category.toLowerCase())
    )
    return ACTION_PROMPTS[key || "default"]
  }

  const handleCopy = async (prompt: string, idx: number) => {
    await navigator.clipboard.writeText(prompt)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Your AI Action Plan
        </CardTitle>
        <CardDescription className="text-[11px]">
          Specific next actions with ready-to-use prompt templates
        </CardDescription>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-3">
        {planItems.map((item, idx) => {
          const promptData = getPromptForCategory(item.category)
          const isExpanded = expandedIdx === idx

          return (
            <div
              key={item.category}
              className="rounded-lg border border-border/50 bg-muted/30 transition-colors"
            >
              <div
                className="flex gap-3 p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/20 text-xs font-bold text-primary">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{item.category}</p>
                    <div className="flex items-center gap-2">
                      {item.score > 0 && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {item.score}/10
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{promptData.action}</p>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">Prompt Template</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopy(promptData.prompt, idx)
                      }}
                    >
                      {copiedIdx === idx ? (
                        <><Check className="h-3 w-3 mr-1" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3 mr-1" /> Copy</>
                      )}
                    </Button>
                  </div>
                  <div className="rounded-md bg-background/50 p-3 text-xs text-muted-foreground font-mono leading-relaxed">
                    {promptData.prompt}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {weakCategories.length > 3 && (
          <p className="text-center text-[11px] text-muted-foreground">
            +{weakCategories.length - 3} more areas to explore
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Prompt Packs with Ready-to-Use Templates ───────────────────────────
const PROMPT_PACK_LIBRARY = [
  {
    id: "email",
    title: "Email Mastery",
    icon: MessageSquare,
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
    icon: Brain,
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
    icon: Zap,
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
    icon: BookOpen,
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
    icon: Lightbulb,
    category: "Innovation",
    description: "Brainstorm solutions and generate creative approaches to problems.",
    prompts: [
      { name: "Problem Reframing", template: "Reframe this problem 5 different ways: [PROBLEM]. For each reframe, suggest a novel solution approach. Include at least one contrarian perspective." },
      { name: "Idea Expansion", template: "Take this initial idea: [IDEA]. Generate 10 variations ranging from conservative to radical. For each, note feasibility (1-5) and potential impact (1-5)." },
      { name: "Reverse Brainstorm", template: "How could we make [GOAL] fail completely? List 10 ways. Then reverse each into a success strategy with specific implementation steps." },
    ]
  },
]

export function PromptPacksCard({
  weakCategories,
}: {
  weakCategories?: { category: string; score: number }[]
}) {
  const [expandedPack, setExpandedPack] = useState<string | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)

  // If we have weak categories, prioritize packs that match
  const weakNames = weakCategories?.map((c) => c.category.toLowerCase()) ?? []
  const sorted = [...PROMPT_PACK_LIBRARY].sort((a, b) => {
    const aMatch = weakNames.some((n) => a.category.toLowerCase().includes(n) || a.title.toLowerCase().includes(n)) ? 0 : 1
    const bMatch = weakNames.some((n) => b.category.toLowerCase().includes(n) || b.title.toLowerCase().includes(n)) ? 0 : 1
    return aMatch - bMatch
  })

  const handleCopy = async (template: string, promptId: string) => {
    await navigator.clipboard.writeText(template)
    setCopiedPrompt(promptId)
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="h-4 w-4 text-cyan" />
          Prompt Packs
        </CardTitle>
        <CardDescription className="text-[11px]">
          Ready-to-use prompt templates matched to your growth areas
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex flex-col gap-2">
          {sorted.slice(0, 4).map((pack) => {
            const isExpanded = expandedPack === pack.id
            const isRecommended = weakNames.some((n) => 
              pack.category.toLowerCase().includes(n) || pack.title.toLowerCase().includes(n)
            )

            return (
              <div key={pack.id} className="rounded-lg border border-border/50 bg-muted/30">
                <div
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50 ${isExpanded ? "border-b border-border/50" : ""}`}
                  onClick={() => setExpandedPack(isExpanded ? null : pack.id)}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${isRecommended ? "bg-cyan/10 ring-cyan/30" : "bg-muted/50 ring-border/50"}`}>
                    <pack.icon className={`h-4 w-4 ${isRecommended ? "text-cyan" : "text-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{pack.title}</p>
                      <Badge variant="secondary" className="text-[9px] h-4">{pack.prompts.length} prompts</Badge>
                      {isRecommended && (
                        <Badge className="text-[9px] h-4 bg-cyan/20 text-cyan hover:bg-cyan/20">Recommended</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{pack.description}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {isExpanded && (
                  <div className="p-3 space-y-2">
                    {pack.prompts.map((prompt, idx) => {
                      const promptId = `${pack.id}-${idx}`
                      return (
                        <div key={idx} className="rounded-md bg-background/50 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-foreground">{prompt.name}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopy(prompt.template, promptId)
                              }}
                            >
                              {copiedPrompt === promptId ? (
                                <><Check className="h-3 w-3 mr-1" /> Copied</>
                              ) : (
                                <><Copy className="h-3 w-3 mr-1" /> Copy</>
                              )}
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                            {prompt.template}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Personal Trend Chart ──────────────────────────────────────────────
export function PersonalTrendChart({ data }: { data: PersonalTrendPoint[] }) {
  if (data.length === 0) return null
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="text-sm font-semibold">
          Your Score Trend vs. Averages
        </CardTitle>
        <CardDescription className="text-[11px]">
          Your scores compared to anonymized department and company averages over time
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="myScore"
              name="You"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ r: 4, fill: "hsl(var(--primary))" }}
            />
            <Line
              type="monotone"
              dataKey="deptAvg"
              name="Dept Avg"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="orgAvg"
              name="Company Avg"
              stroke="hsl(var(--chart-3))"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
