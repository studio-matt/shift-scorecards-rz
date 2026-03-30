"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Flame, CheckCircle2, Target, Building2, Users, Clock, Send, DollarSign, Gauge, Trophy } from "lucide-react"
import type { AdminStats, OrgHoursMetrics, UserHoursMetrics } from "@/lib/dashboard-data"

interface UserStatCardsProps {
  avgScore: number
  fieldAverage: number
  lastMonthAvg: number
  myGoal: number
  streak: number
  maxStreak: number
  completedSections: number
  totalSections: number
  percentile: number
  hoursMetrics?: UserHoursMetrics | null
  hourlyRate?: number
}

export function StatCards({
  avgScore,
  fieldAverage,
  lastMonthAvg,
  myGoal,
  streak,
  maxStreak,
  completedSections,
  totalSections,
  percentile,
  hoursMetrics,
  hourlyRate = 100,
}: UserStatCardsProps) {
  // Format helpers
  const formatHours = (hrs: number) => hrs >= 1000 ? `${(hrs / 1000).toFixed(1)}K` : hrs.toFixed(0)
  const formatValue = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `$${Math.round(val / 1000)}K`
    return `$${Math.round(val).toLocaleString()}`
  }

  // Calculate hours-based metrics
  const thisMonthHours = hoursMetrics?.thisMonthHours ?? 0
  const lastMonthHours = hoursMetrics?.lastMonthHours ?? 0
  const hoursChange = thisMonthHours - lastMonthHours
  const productivityPercent = hoursMetrics?.productivityPercent ?? 0
  const lastMonthProductivity = lastMonthHours > 0 ? ((lastMonthHours / 4) / 40) * 100 : 0
  const productivityChange = productivityPercent - lastMonthProductivity
  const monthlyValue = Math.round(thisMonthHours * hourlyRate)
  const lastMonthValue = Math.round(lastMonthHours * hourlyRate)
  const valueChange = monthlyValue - lastMonthValue
  const confidenceScore = hoursMetrics?.confidenceScore ?? avgScore
  const confidenceChange = (hoursMetrics?.confidenceScore ?? avgScore) - (hoursMetrics?.lastMonthConfidence ?? lastMonthAvg)

  return (
    <div className="flex flex-col gap-4">
      {/* Top row: Avg Productivity, Hours Saved, Value Created */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Avg Productivity */}
        <Card className="relative min-h-[140px] overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <CardContent className="relative flex h-full items-start gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/20">
              <Gauge className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium leading-snug text-muted-foreground">Avg Productivity</p>
              <p className="text-3xl font-bold text-foreground">{productivityPercent.toFixed(1)}%</p>
              <p className={`mt-1 text-xs ${productivityChange >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {productivityChange >= 0 ? "+" : ""}{productivityChange.toFixed(1)}% vs last month
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hours Saved */}
        <Card className="relative min-h-[140px] overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan/10 via-transparent to-transparent" />
          <CardContent className="relative flex h-full items-start gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cyan/15 ring-1 ring-cyan/20">
              <Clock className="h-6 w-6 text-cyan" />
            </div>
            <div>
              <p className="text-sm font-medium leading-snug text-muted-foreground">Hours Saved</p>
              <p className="text-3xl font-bold text-foreground">{formatHours(thisMonthHours)}<span className="text-base text-muted-foreground"> hrs</span></p>
              <p className={`mt-1 text-xs ${hoursChange >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {hoursChange >= 0 ? "+" : ""}{formatHours(hoursChange)} vs last month
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Value Created */}
        <Card className="relative min-h-[140px] overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
          <CardContent className="relative flex h-full items-start gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/20">
              <DollarSign className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium leading-snug text-muted-foreground">Value Created</p>
              <p className="text-3xl font-bold text-foreground">{formatValue(monthlyValue)}</p>
              <p className={`mt-1 text-xs ${valueChange >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {valueChange >= 0 ? "+" : ""}{formatValue(Math.abs(valueChange))} vs last month
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Completed, Confidence, Your Rank */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Completed */}
        <Card className="relative min-h-[140px] overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent" />
          <CardContent className="relative flex h-full items-start gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/20">
              <CheckCircle2 className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium leading-snug text-muted-foreground">Completed</p>
              <p className="text-3xl font-bold text-foreground">{completedSections}<span className="text-base text-muted-foreground">/{totalSections}</span></p>
              <p className="mt-1 text-xs text-muted-foreground">
                scorecards this period
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Confidence */}
        <Card className="relative min-h-[140px] overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent" />
          <CardContent className="relative flex h-full items-start gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 ring-1 ring-purple-500/20">
              <TrendingUp className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium leading-snug text-muted-foreground">Confidence</p>
              <p className="text-3xl font-bold text-foreground">{confidenceScore.toFixed(1)}</p>
              <p className={`mt-1 text-xs ${confidenceChange >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {confidenceChange >= 0 ? "+" : ""}{confidenceChange.toFixed(1)} vs last month
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Your Rank */}
        <Card className="relative min-h-[140px] overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent" />
          <CardContent className="relative flex h-full items-start gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 ring-1 ring-orange-500/20">
              <Trophy className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium leading-snug text-muted-foreground">Your Rank</p>
              <p className="text-3xl font-bold text-foreground">{percentile}<span className="text-base text-muted-foreground">th</span></p>
              <p className="mt-1 text-xs text-muted-foreground">
                percentile in your company
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface DashboardTargets {
  avgScore: number
  completionRate: number
  activeUsers: number
  scorecardsSent: number
  fieldAverage: number
}

interface AdminStatCardsProps {
  data: AdminStats
  targets?: DashboardTargets
  hoursMetrics?: OrgHoursMetrics | null
}

const adminGradients = [
  "from-primary/10",
  "from-emerald-500/10",
  "from-cyan/10",
  "from-amber-500/10",
  "from-primary/10",
]

const adminIconColors = [
  { bg: "bg-primary/15 ring-1 ring-primary/20", text: "text-primary" },
  { bg: "bg-emerald-500/15 ring-1 ring-emerald-500/20", text: "text-emerald-400" },
  { bg: "bg-cyan/15 ring-1 ring-cyan/20", text: "text-cyan" },
  { bg: "bg-amber-500/15 ring-1 ring-amber-500/20", text: "text-amber-400" },
  { bg: "bg-primary/15 ring-1 ring-primary/20", text: "text-primary" },
]

export function AdminStatCards({ data: s, targets, hoursMetrics }: AdminStatCardsProps) {
  const tCompletionRate = targets?.completionRate ?? 85
  const tActiveUsers = targets?.activeUsers ?? 100
  const tScorecardsSent = targets?.scorecardsSent ?? 50

  function vsTarget(actual: number, target: number, unit = "") {
    const diff = actual - target
    if (Math.abs(diff) < 0.05) return { text: `On target (${target}${unit})`, positive: true }
    if (diff > 0) return { text: `${diff.toFixed(unit === "%" ? 0 : 1)}${unit} above target (${target}${unit})`, positive: true }
    return { text: `${Math.abs(diff).toFixed(unit === "%" ? 0 : 1)}${unit} below target (${target}${unit})`, positive: false }
  }

  const completionVs = vsTarget(s.completionRate, tCompletionRate, "%")
  const usersVs = vsTarget(s.activeUsers, tActiveUsers)
  const sentVs = vsTarget(s.scorecardsSent, tScorecardsSent)

  // Format helpers
  const formatHours = (hrs: number) => hrs >= 1000 ? `${(hrs / 1000).toFixed(1)}K` : hrs.toFixed(0)
  const formatValue = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `$${Math.round(val / 1000)}K`
    return `$${Math.round(val).toLocaleString()}`
  }

  // Hours-based cards when metrics available
  const adminCards = hoursMetrics ? [
    {
      label: "Hours Saved / Month",
      value: formatHours(hoursMetrics.monthlyHours),
      change: hoursMetrics.monthOverMonthChange >= 0 
        ? `+${formatHours(hoursMetrics.monthOverMonthChange)} from last month`
        : `${formatHours(hoursMetrics.monthOverMonthChange)} from last month`,
      icon: Clock,
      positive: hoursMetrics.monthOverMonthChange >= 0,
    },
    {
      label: "Avg Productivity",
      value: `${hoursMetrics.avgProductivityPercent.toFixed(1)}%`,
      change: `${hoursMetrics.fteEquivalent.toFixed(1)} FTE equivalent`,
      icon: Gauge,
      positive: true,
    },
    {
      label: "Value Created",
      value: formatValue(hoursMetrics.monthlyValue),
      change: `${formatValue(hoursMetrics.annualValue)} annual run rate`,
      icon: DollarSign,
      positive: true,
    },
    {
      label: "Avg Confidence",
      value: hoursMetrics.avgConfidence.toFixed(1),
      change: hoursMetrics.confidenceChange >= 0 
        ? `+${hoursMetrics.confidenceChange.toFixed(1)} from last month`
        : `${hoursMetrics.confidenceChange.toFixed(1)} from last month`,
      icon: Target,
      positive: hoursMetrics.confidenceChange >= 0,
    },
    {
      label: "Active Participants",
      value: hoursMetrics.activeParticipants.toLocaleString(),
      change: `${hoursMetrics.thisMonthResponses} scorecards this month`,
      icon: Users,
      positive: true,
    },
  ] : [
    // Fallback to traditional metrics if hours not available
    {
      label: "Completion Rate",
      value: `${s.completionRate}%`,
      change: completionVs.text,
      icon: CheckCircle2,
      positive: completionVs.positive,
    },
    {
      label: "Active Users",
      value: s.activeUsers.toLocaleString(),
      change: usersVs.text,
      icon: Users,
      positive: usersVs.positive,
    },
    {
      label: "Scorecards Sent",
      value: s.scorecardsSent.toLocaleString(),
      change: sentVs.text,
      icon: Send,
      positive: sentVs.positive,
    },
    {
      label: "Organizations",
      value: s.totalOrgs.toString(),
      change: `${s.totalUsers} total users`,
      icon: Building2,
      positive: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {adminCards.map((stat, idx) => (
        <Card key={stat.label} className="relative min-h-[120px] overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${adminGradients[idx]} via-transparent to-transparent`} />
          <CardContent className="relative flex h-full items-start gap-4 p-5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${adminIconColors[idx].bg}`}>
              <stat.icon className={`h-5 w-5 ${adminIconColors[idx].text}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {stat.value}
              </p>
              <p className={`mt-0.5 text-xs ${stat.positive === false ? "text-amber-400" : "text-emerald-400"}`}>
                {stat.change}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
