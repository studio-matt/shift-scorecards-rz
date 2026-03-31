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
  ChevronRight,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import type {
  UserPersonalStreak,
  PersonalTrendPoint,
  PersonalVsBenchmark,
} from "@/lib/dashboard-data"

// ── Productivity Hero Section (3 hero cards matching reference design) ──
export interface ProductivityHeroData {
  // This month
  productivityPercent: number      // (weeklyAvgHours / 40) * 100
  lastMonthProductivity: number    // For comparison
  monthlyHours: number             // Total hours saved this month
  lastMonthHours: number           // For comparison
  monthlyValue: number             // hours * hourlyRate
  lastMonthValue: number           // For comparison
  // Additional context
  hourlyRate: number
  fteEquivalent: number            // monthlyHours / 160
  annualRunRate: number            // monthlyHours * 12
  annualValue: number              // monthlyValue * 12
  perPersonValue?: number          // For org view
  activeParticipants?: number      // For org view
  // Confidence
  confidenceScore: number          // 1-10
  lastMonthConfidence: number      // For comparison
  // Response counts
  thisMonthResponses: number
  lastMonthResponses: number
}

export function ProductivityHero({ data }: { data: ProductivityHeroData }) {
  // Calculate month-over-month changes
  const productivityChange = data.productivityPercent - data.lastMonthProductivity
  const hoursChange = data.monthlyHours - data.lastMonthHours
  const hoursChangePercent = data.lastMonthHours > 0 
    ? ((data.monthlyHours - data.lastMonthHours) / data.lastMonthHours) * 100 
    : data.monthlyHours > 0 ? 100 : 0
  const valueChange = data.monthlyValue - data.lastMonthValue
  const confidenceChange = data.confidenceScore - data.lastMonthConfidence
  const responseChange = data.thisMonthResponses - data.lastMonthResponses
  const responseChangePercent = data.lastMonthResponses > 0
    ? ((data.thisMonthResponses - data.lastMonthResponses) / data.lastMonthResponses) * 100
    : data.thisMonthResponses > 0 ? 100 : 0

  // Format large numbers
  const formatValue = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `$${Math.round(val / 1000)}K`
    return `$${Math.round(val).toLocaleString()}`
  }

  const formatHours = (hrs: number) => {
    if (hrs >= 1000) return hrs.toLocaleString(undefined, { maximumFractionDigits: 0 })
    return hrs.toLocaleString(undefined, { maximumFractionDigits: 1 })
  }

  // Get current month name
  const currentMonth = new Date().toLocaleString("default", { month: "long" })
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString("default", { month: "short" })

  return (
    <div className="flex flex-col gap-4">
      {/* Hero Cards Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Avg Productivity */}
        <Card className="relative overflow-hidden border-indigo-500/30 bg-gradient-to-br from-indigo-600/20 via-purple-600/15 to-card">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl" />
          <CardContent className="relative p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
              Avg Productivity
            </p>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-4xl font-bold tracking-tight text-white">
                {data.productivityPercent.toFixed(1)}%
              </span>
              {productivityChange !== 0 && (
                <div className="flex flex-col">
                  <span className={`text-sm font-semibold ${productivityChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {productivityChange >= 0 ? "+" : ""}{productivityChange.toFixed(1)}pp
                  </span>
                  <span className="text-[10px] text-indigo-300/70">from {lastMonth}</span>
                </div>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-indigo-950/50">
                <div 
                  className="h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-500"
                  style={{ width: `${Math.min(data.productivityPercent, 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-indigo-300/60">of 40-hr week</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Hours Saved / Month */}
        <Card className="relative overflow-hidden border-cyan-500/30 bg-gradient-to-br from-cyan-600/20 via-teal-600/15 to-card">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/20 blur-2xl" />
          <CardContent className="relative p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
              Hours Saved / Month
            </p>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-4xl font-bold tracking-tight text-white">
                {formatHours(data.monthlyHours)}
              </span>
              {hoursChange !== 0 && (
                <div className="flex flex-col">
                  <span className={`text-sm font-semibold ${hoursChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {hoursChange >= 0 ? "+" : ""}{formatHours(hoursChange)}
                  </span>
                  <span className="text-[10px] text-cyan-300/70">
                    {hoursChangePercent >= 0 ? "+" : ""}{hoursChangePercent.toFixed(1)}% from {lastMonth}
                  </span>
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-cyan-300/60">
              {data.fteEquivalent.toFixed(1)} FTE equivalent · {formatHours(data.annualRunRate)} annual run rate
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Value Created / Month */}
        <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-600/20 via-green-600/15 to-card">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl" />
          <CardContent className="relative p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              Value Created / Month
            </p>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-4xl font-bold tracking-tight text-white">
                {formatValue(data.monthlyValue)}
              </span>
              {valueChange !== 0 && (
                <div className="flex flex-col">
                  <span className={`text-sm font-semibold ${valueChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {valueChange >= 0 ? "+" : ""}{formatValue(Math.abs(valueChange))}
                  </span>
                  <span className="text-[10px] text-emerald-300/70">at ${data.hourlyRate}/hr</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-emerald-300/60">
              {formatValue(data.annualValue)} annual run rate
              {data.perPersonValue !== undefined && data.activeParticipants !== undefined && (
                <> · {formatValue(data.perPersonValue)}/person/mo</>
              )}
            </p>
          </CardContent>
        </Card>
      </div>


    </div>
  )
}

// Keep legacy AIJourneyHero for backwards compatibility (deprecated)
/** @deprecated Use ProductivityHero instead */
export function AIJourneyHero({
  hoursSaved,
  dollarValue,
  hourlyRate = 100,
}: {
  hoursSaved: number
  dollarValue: number
  startScore?: number
  currentScore?: number
  fieldAverage?: number
  percentile?: number
  cohortCount?: number
  hourlyRate?: number
}) {
  const weeksEquivalent = Math.round(hoursSaved / 40 * 10) / 10

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
      <CardContent className="relative p-6 md:p-8">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Your AI Journey</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight text-foreground md:text-6xl">{hoursSaved}</span>
            <span className="text-xl text-muted-foreground">hours saved</span>
          </div>
          <p className="mt-2 text-lg text-muted-foreground">{impactStatement}</p>
          <div className="mt-4 flex flex-col items-start gap-1">
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 w-fit">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              <span className="text-2xl font-bold text-emerald-400">${dollarValue.toLocaleString()}</span>
              <span className="text-sm text-emerald-400/80">in reclaimed capacity</span>
            </div>
            <span className="text-[10px] text-muted-foreground/60 ml-1">Based on ${hourlyRate}/hr rate</span>
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

// ── Monthly Progress Card (hours saved month over month) ────────────────────────
export function PersonalBenchmarkCard({
  data,
  fieldAverage,
  monthlyGoal,
  lastMonthAvg,
  thisMonthHours,
  lastMonthHours,
}: {
  data: PersonalVsBenchmark
  fieldAverage?: number
  monthlyGoal?: number
  lastMonthAvg?: number
  thisMonthHours?: number
  lastMonthHours?: number
}) {
  const currentHours = thisMonthHours ?? 0
  const previousHours = lastMonthHours ?? 0
  const hoursChange = currentHours - previousHours
  const percentChange = previousHours > 0 ? ((hoursChange / previousHours) * 100) : 0

  const VelocityIcon =
    hoursChange > 0 ? TrendingUp :
    hoursChange < 0 ? TrendingDown :
    Minus

  const velocityColor =
    hoursChange > 0 ? "text-emerald-500" :
    hoursChange < 0 ? "text-red-500" :
    "text-muted-foreground"

  const velocityLabel =
    hoursChange > 0 ? "Increasing" :
    hoursChange < 0 ? "Decreasing" :
    "Steady"

  const formatHours = (hrs: number) => hrs >= 1000 ? `${(hrs / 1000).toFixed(1)}K` : hrs.toFixed(1)

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-primary" />
          Your Monthly Progress in Context
        </CardTitle>
        <CardDescription className="text-[11px]">
          Hours saved month over month comparison
        </CardDescription>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-4">
        {/* Primary hours */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-primary bg-primary/10">
            <span className="text-xl font-bold text-primary">{formatHours(currentHours)}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">This Month</p>
            <div className="mt-1 flex items-center gap-2">
              <VelocityIcon className={`h-3.5 w-3.5 ${velocityColor}`} />
              <span className={`text-xs font-medium ${velocityColor}`}>
                {velocityLabel} ({hoursChange >= 0 ? "+" : ""}{formatHours(hoursChange)} hrs)
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-foreground">{data.percentile}<span className="text-xs text-muted-foreground">th</span></p>
            <p className="text-[10px] text-muted-foreground">percentile</p>
          </div>
        </div>

        {/* Month over month comparison */}
        <div className="flex flex-col gap-2">
          <div className="rounded-md border border-border px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Last Month</p>
                <p className="text-[10px] text-muted-foreground">Previous period hours</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatHours(previousHours)} hrs</span>
                <Badge
                  variant={hoursChange >= 0 ? "default" : "secondary"}
                  className={`text-[10px] h-5 ${hoursChange >= 0 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400"}`}
                >
                  {hoursChange >= 0 ? "+" : ""}{percentChange.toFixed(0)}%
                </Badge>
              </div>
            </div>
          </div>
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
  hourlyRate = 100,
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
import type { ActionPrompt } from "@/lib/prompt-settings"
import { DEFAULT_ACTION_PROMPTS } from "@/lib/prompt-settings"

const DEFAULT_ACTION_PROMPT = {
  action: "Start with a structured prompt for any task.",
  prompt: "I need help with [TASK]. Here's the context: [BACKGROUND]. My goal is to [DESIRED OUTCOME]. Please provide: 1) A step-by-step approach, 2) Key considerations, 3) Potential pitfalls to avoid, 4) A template or framework I can use."
}

export function AIActionPlanCard({
  weakCategories,
  score,
  actionPrompts = [],
}: {
  weakCategories: { category: string; score: number; suggestion: string }[]
  score: number
  actionPrompts?: ActionPrompt[]
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  // Use defaults if no prompts provided
  const prompts = actionPrompts.length > 0 ? actionPrompts : DEFAULT_ACTION_PROMPTS

  const planItems = weakCategories.length > 0
    ? weakCategories.slice(0, 3)
    : [
        { category: "Getting Started", score: 0, suggestion: "Complete your first scorecard to receive a personalized AI action plan." },
      ]

  const getPromptForCategory = (category: string) => {
    // Find matching action prompt from settings
    const match = prompts.find(ap => 
      category.toLowerCase().includes(ap.category.toLowerCase()) || 
      ap.category.toLowerCase().includes(category.toLowerCase())
    )
    if (match) {
      return { action: match.action, prompt: match.prompt }
    }
    return DEFAULT_ACTION_PROMPT
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

// ── Prompt Packs - Links to Real Packs ───────────────────────────────
import Image from "next/image"

// Featured prompt packs from the main prompt packs page - exact data from /prompt-packs
const FEATURED_PROMPT_PACKS = [
  {
    id: "you-are-the-product",
    title: "You Are The Product Prompt Pack",
    subtitle: "Biases, Blind Spots, Binds, and Bottlenecks",
    promptCount: 25,
    icon: Brain,
    color: "from-purple-500 to-pink-500",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/you%20are%20the%20product-Pq0VsCopzX2obmFSZmcUEb593nITxR.png",
  },
  {
    id: "master-prompt-builder",
    title: "The Master Prompt Builder",
    subtitle: "Design Your AI Operating System",
    icon: Wrench,
    color: "from-blue-500 to-cyan-500",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/master%20prompt%20builder-yFl5O0aWN4MxN3Rk4sY5NMYKWrah6G.png",
  },
  {
    id: "leader-manager",
    title: "Leader & Manager Prompt Pack",
    subtitle: "50 AI Prompts Across 10 Leadership Responsibilities",
    promptCount: 50,
    icon: Target,
    color: "from-rose-500 to-pink-500",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/leader-manager-header_8048d214-JWT91cOgiCBvSA3JB1zec722eDTsDc.png",
  },
  {
    id: "high-performance-flow",
    title: "The High Performance & Flow Prompt Pack",
    subtitle: "Rhythms, Rituals & Routines for Peak Performance",
    promptCount: 14,
    icon: Rocket,
    color: "from-violet-500 to-purple-500",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/header-high-performance_cc6133d2-QQ6UKPDNSpvI0Ao7fU2OyWCE5RN7O9.png",
  },
]

export function PromptPacksCard() {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="h-4 w-4 text-cyan" />
              Prompt Packs
            </CardTitle>
            <CardDescription className="text-[11px]">
              Ready-to-use AI prompt collections for every situation
            </CardDescription>
          </div>
          <Link href="/prompt-packs">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              View All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="grid grid-cols-2 gap-2">
          {FEATURED_PROMPT_PACKS.map((pack) => {
            const IconComponent = pack.icon
            return (
              <Link
                key={pack.id}
                href={`/prompt-packs?pack=${pack.id}`}
                className="group rounded-lg border border-border/50 bg-muted/30 overflow-hidden transition-all hover:border-cyan/30 hover:bg-muted/50"
              >
                {pack.image && (
                  <div className="relative h-20 w-full overflow-hidden">
                    <Image
                      src={pack.image}
                      alt={pack.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  </div>
                )}
                <div className="p-2.5">
                  <div className="flex items-start gap-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${pack.color}`}>
                      <IconComponent className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{pack.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{pack.subtitle}</p>
                      {pack.promptCount && (
                        <Badge variant="secondary" className="text-[9px] h-4 mt-1">{pack.promptCount} prompts</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-border/50">
          <Link href="/prompt-packs" className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-cyan transition-colors">
            <Sparkles className="h-3 w-3" />
            Explore all 11 prompt packs with 200+ prompts
            <ChevronRight className="h-3 w-3" />
          </Link>
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
