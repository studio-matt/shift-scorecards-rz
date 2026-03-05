"use client"

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
} from "lucide-react"
import type {
  UserPersonalStreak,
  PersonalTrendPoint,
  PersonalVsBenchmark,
} from "@/lib/dashboard-data"

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
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardContent className="relative flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
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
          <Button size="sm" variant="default" asChild>
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Flame className="h-4 w-4" style={{ color: streakColor }} />
            Response Streak
          </span>
          <FlameStack streak={data.currentStreak} />
        </CardTitle>
      </CardHeader>
      <CardContent>
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-primary" />
          Your Score in Context
        </CardTitle>
        <CardDescription className="text-[11px]">
          How you compare across three key reference points
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Primary score */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-primary bg-primary/5">
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
    <Card className="relative overflow-hidden">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-emerald-500/5" />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-emerald-600" />
          Your Hours Saved
        </CardTitle>
      </CardHeader>
      <CardContent>
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
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30">
          <Hand className="h-6 w-6 text-amber-500" />
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

// ── AI Action Plan ─────────────────────────────────────────────────────
export function AIActionPlanCard({
  weakCategories,
  score,
}: {
  weakCategories: { category: string; score: number; suggestion: string }[]
  score: number
}) {
  const planItems = weakCategories.length > 0
    ? weakCategories.slice(0, 3)
    : [
        { category: "Getting Started", score: 0, suggestion: "Complete your first scorecard to receive a personalized AI action plan." },
      ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Your AI Action Plan
        </CardTitle>
        <CardDescription className="text-[11px]">
          Personalized recommendations based on your scorecard results
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {planItems.map((item, idx) => (
          <div
            key={item.category}
            className="flex gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {idx + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{item.category}</p>
                {item.score > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    Score: {item.score}/10
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.suggestion}</p>
            </div>
          </div>
        ))}
        {weakCategories.length > 3 && (
          <p className="text-center text-[11px] text-muted-foreground">
            +{weakCategories.length - 3} more areas to explore
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Prompt Packs ───────────────────────────────────────────────────────
const PROMPT_PACK_LIBRARY = [
  {
    id: "email",
    title: "Email Mastery",
    icon: MessageSquare,
    category: "Communication",
    prompts: 12,
    description: "Draft, refine, and automate professional emails 3x faster.",
  },
  {
    id: "analysis",
    title: "Data Analysis",
    icon: Brain,
    category: "Data & Reporting",
    prompts: 8,
    description: "Turn raw data into actionable insights with structured prompts.",
  },
  {
    id: "creative",
    title: "Creative Ideation",
    icon: Lightbulb,
    category: "Innovation",
    prompts: 10,
    description: "Brainstorm solutions and generate creative approaches to problems.",
  },
  {
    id: "meetings",
    title: "Meeting Prep",
    icon: BookOpen,
    category: "Productivity",
    prompts: 6,
    description: "Create agendas, summarize notes, and extract action items.",
  },
  {
    id: "writing",
    title: "Professional Writing",
    icon: Zap,
    category: "Communication",
    prompts: 14,
    description: "Proposals, reports, and documentation with polished AI assistance.",
  },
]

export function PromptPacksCard({
  weakCategories,
}: {
  weakCategories?: { category: string; score: number }[]
}) {
  // If we have weak categories, prioritize packs that match
  const weakNames = weakCategories?.map((c) => c.category.toLowerCase()) ?? []
  const sorted = [...PROMPT_PACK_LIBRARY].sort((a, b) => {
    const aMatch = weakNames.some((n) => a.category.toLowerCase().includes(n) || a.title.toLowerCase().includes(n)) ? 0 : 1
    const bMatch = weakNames.some((n) => b.category.toLowerCase().includes(n) || b.title.toLowerCase().includes(n)) ? 0 : 1
    return aMatch - bMatch
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="h-4 w-4 text-primary" />
          Prompt Packs
        </CardTitle>
        <CardDescription className="text-[11px]">
          Curated prompt libraries to accelerate your weakest areas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {sorted.slice(0, 4).map((pack) => (
            <div
              key={pack.id}
              className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <pack.icon className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{pack.title}</p>
                  <Badge variant="secondary" className="text-[9px] h-4">{pack.prompts} prompts</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{pack.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Personal Trend Chart ──────────────────────────────────────────────
export function PersonalTrendChart({ data }: { data: PersonalTrendPoint[] }) {
  if (data.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Your Score Trend vs. Averages
        </CardTitle>
        <CardDescription className="text-[11px]">
          Your scores compared to anonymized department and company averages over time
        </CardDescription>
      </CardHeader>
      <CardContent>
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
