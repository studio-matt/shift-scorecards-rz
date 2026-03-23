"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Flame, CheckCircle2, Target, Building2, Users, Clock, Send, DollarSign, Gauge } from "lucide-react"
import type { AdminStats, OrgHoursMetrics } from "@/lib/dashboard-data"

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
}: UserStatCardsProps) {
  const scoreDiff = avgScore - lastMonthAvg
  const vsField = avgScore - fieldAverage
  const vsGoal = avgScore - myGoal

  const streakColor =
    streak >= 8 ? "text-red-400" :
    streak >= 4 ? "text-orange-400" :
    streak >= 2 ? "text-amber-400" :
    "text-muted-foreground"

  const streakBg =
    streak >= 8 ? "bg-red-500/15" :
    streak >= 4 ? "bg-orange-500/15" :
    streak >= 2 ? "bg-amber-500/15" :
    "bg-muted"

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Hours Saved */}
      <Card className="relative min-h-[120px] overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <CardContent className="relative flex h-full items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/20">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium leading-snug text-muted-foreground">Hours Saved</p>
            <p className="text-2xl font-bold text-foreground">{avgScore.toFixed(1)}<span className="text-sm text-muted-foreground"> hrs</span></p>
            <div className="mt-1 flex flex-col gap-0.5">
              <p className={`text-[11px] ${scoreDiff >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {scoreDiff >= 0 ? "+" : ""}{scoreDiff.toFixed(1)} vs last month
              </p>
              <p className={`text-[11px] ${vsField >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {vsField >= 0 ? "+" : ""}{vsField.toFixed(1)} vs field avg ({fieldAverage.toFixed(1)})
              </p>
              <p className={`text-[11px] ${vsGoal >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {vsGoal >= 0 ? "+" : ""}{vsGoal.toFixed(1)} vs goal ({myGoal.toFixed(1)})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak */}
      <Card className="relative min-h-[120px] overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent" />
        <CardContent className="relative flex h-full items-start gap-4 p-5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${streakBg} ring-1 ring-orange-500/20`}>
            <Flame className={`h-5 w-5 ${streakColor}`} />
          </div>
          <div>
            <p className="text-sm font-medium leading-snug text-muted-foreground">Streak</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold text-foreground">{streak}</p>
              <span className="text-sm text-muted-foreground">weeks</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Best: {maxStreak} weeks
            </p>
            {streak >= 4 && (
              <div className="mt-1 flex gap-0.5">
                {Array.from({ length: Math.min(streak, 8) }).map((_, i) => (
                  <Flame key={i} className={`h-3 w-3 ${streakColor}`} />
                ))}
                {streak > 8 && <span className={`text-[10px] font-bold ${streakColor}`}>+{streak - 8}</span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completed */}
      <Card className="relative min-h-[120px] overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
        <CardContent className="relative flex h-full items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium leading-snug text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-foreground">{completedSections}<span className="text-base text-muted-foreground">/{totalSections}</span></p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              scorecard sections this period
            </p>
            {completedSections === totalSections && (
              <p className="mt-0.5 text-[11px] font-medium text-emerald-400">All sections complete!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Percentile rank */}
      <Card className="relative min-h-[120px] overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan/10 via-transparent to-transparent" />
        <CardContent className="relative flex h-full items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan/15 ring-1 ring-cyan/20">
            <Target className="h-5 w-5 text-cyan" />
          </div>
          <div>
            <p className="text-sm font-medium leading-snug text-muted-foreground">Your Rank</p>
            <p className="text-2xl font-bold text-foreground">{percentile}<span className="text-sm text-muted-foreground">th</span></p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              percentile in your company
            </p>
            {percentile >= 75 && (
              <p className="mt-0.5 text-[11px] font-medium text-emerald-400">Top quartile performer</p>
            )}
          </div>
        </CardContent>
      </Card>
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
