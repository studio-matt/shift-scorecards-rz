"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TrendingUp, Flame, CheckCircle2, Target, Building2, Users, Clock, Send, DollarSign, Gauge, Trophy, Info } from "lucide-react"
import type { AdminStats, OrgHoursMetrics, UserHoursMetrics } from "@/lib/dashboard-data"

// Tooltip explanations for each metric (JSX for better formatting)
const METRIC_EXPLANATIONS = {
  // User metrics
  completed: (
    <div className="space-y-1">
      <p className="font-semibold">Completed Scorecards</p>
      <p>Shows how many scorecards you have finished this period compared to how many were assigned to you.</p>
    </div>
  ),
  confidence: (
    <div className="space-y-1">
      <p className="font-semibold">Confidence Level</p>
      <p>Your average self-reported confidence across all questions.</p>
      <ul className="list-disc pl-4 space-y-0.5">
        <li>Scale: 1-10 (higher is better)</li>
        <li>Measures how confident you feel in your work</li>
      </ul>
    </div>
  ),
  rank: (
    <div className="space-y-1">
      <p className="font-semibold">Percentile Rank</p>
      <p>Your ranking compared to others in your company based on confidence levels.</p>
      <ul className="list-disc pl-4 space-y-0.5">
        <li>90th = Top 10% of your company</li>
        <li>50th = Middle of the pack</li>
      </ul>
    </div>
  ),
  
  // Admin metrics
  totalHoursSaved: (
    <div className="space-y-1">
      <p className="font-semibold">Total Hours Saved</p>
      <p>Sum of all time savings reported by employees this month.</p>
      <ul className="list-disc pl-4 space-y-0.5">
        <li>Collected from "hours saved" questions in scorecards</li>
        <li>Aggregated across all participants</li>
      </ul>
    </div>
  ),
  productivityGain: (
    <div className="space-y-1">
      <p className="font-semibold">Productivity Gain %</p>
      <p>Hours saved as a percentage of total work capacity.</p>
      <ul className="list-disc pl-4 space-y-0.5">
        <li>Formula: Hours Saved / (Participants x 160 hrs) x 100</li>
        <li>160 hours = standard monthly work hours per person</li>
      </ul>
    </div>
  ),
  valueCreated: (hourlyRate: number) => (
    <div className="space-y-1">
      <p className="font-semibold">Value Created</p>
      <p>Estimated dollar value of time saved.</p>
      <ul className="list-disc pl-4 space-y-0.5">
        <li>Formula: Hours Saved x Hourly Rate</li>
        <li>Your company rate: ${hourlyRate}/hour</li>
      </ul>
    </div>
  ),
  avgConfidence: (
    <div className="space-y-1">
      <p className="font-semibold">Average Confidence</p>
      <p>Mean confidence score across all participants.</p>
      <ul className="list-disc pl-4 space-y-0.5">
        <li>Scale: 1-10</li>
        <li>Calculated from all submitted responses</li>
      </ul>
    </div>
  ),
  activeParticipants: (
    <div className="space-y-1">
      <p className="font-semibold">Active Participants</p>
      <p>Number of unique users who submitted at least one scorecard this month.</p>
    </div>
  ),
  completionRate: (
    <div className="space-y-1">
      <p className="font-semibold">Completion Rate</p>
      <p>Percentage of assigned scorecards that have been completed.</p>
      <ul className="list-disc pl-4 space-y-0.5">
        <li>Formula: Completed / Assigned x 100</li>
      </ul>
    </div>
  ),
  activeUsers: (
    <div className="space-y-1">
      <p className="font-semibold">Active Users</p>
      <p>Total number of users actively using the platform.</p>
    </div>
  ),
  scorecardsSent: (
    <div className="space-y-1">
      <p className="font-semibold">Scorecards Sent</p>
      <p>Number of scorecards distributed to employees this period.</p>
    </div>
  ),
  organizations: (
    <div className="space-y-1">
      <p className="font-semibold">Organizations</p>
      <p>Total number of organizations or teams in the system.</p>
    </div>
  ),
  fteEquivalent: (
    <div className="space-y-1">
      <p className="font-semibold">FTE Equivalent</p>
      <p>Hours saved converted to full-time employee equivalent.</p>
      <ul className="list-disc pl-4 space-y-0.5">
        <li>160 hours = 1 FTE per month</li>
      </ul>
    </div>
  ),
} as const

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
  lastMonthAvg,
  completedSections,
  totalSections,
  percentile,
  hoursMetrics,
  hourlyRate = 100,
}: UserStatCardsProps) {
  const confidenceScore = hoursMetrics?.confidenceScore ?? avgScore
  const confidenceChange = (hoursMetrics?.confidenceScore ?? avgScore) - (hoursMetrics?.lastMonthConfidence ?? lastMonthAvg)
  
  // Format helpers
  const formatHours = (hrs: number) => hrs >= 1000 ? `${(hrs / 1000).toFixed(1)}K` : hrs.toFixed(1)
  const formatValue = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `$${Math.round(val / 1000)}K`
    return `$${Math.round(val).toLocaleString()}`
  }
  
  const totalHours = hoursMetrics?.totalHoursSaved ?? 0
  const productivityPercent = hoursMetrics?.productivityPercent ?? 0
  const dollarValue = totalHours * hourlyRate

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Completed */}
        <Card className="relative border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent" />
          <CardContent className="relative flex items-start gap-4 p-5">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/20">
                <CheckCircle2 className="h-5 w-5 text-amber-400" />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border hover:bg-muted/80 transition-colors">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] text-xs z-50">
                  {METRIC_EXPLANATIONS.completed}
                </TooltipContent>
              </Tooltip>
            </div>
            <div>
              <p className="text-sm font-medium leading-snug text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-foreground">
                {completedSections}
                {totalSections > 0 && <span className="text-base text-muted-foreground">/{totalSections}</span>}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {totalSections > 0 ? "scorecards this period" : "scorecard coming soon"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Productivity Gain */}
        <Card className="relative border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
          <CardContent className="relative flex items-start gap-4 p-5">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/20">
                <Gauge className="h-5 w-5 text-emerald-400" />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border hover:bg-muted/80 transition-colors">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] text-xs z-50">
                  <div className="space-y-1">
                    <p className="font-semibold">Productivity Gain</p>
                    <p>Percentage of your work week saved through AI usage.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div>
              <p className="text-sm font-medium leading-snug text-muted-foreground">Productivity Gain</p>
              <p className="text-2xl font-bold text-foreground">{productivityPercent.toFixed(1)}%</p>
              <p className="mt-1 text-xs text-muted-foreground">
                of your work week
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Confidence */}
        <Card className="relative border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent" />
          <CardContent className="relative flex items-start gap-4 p-5">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 ring-1 ring-purple-500/20">
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border hover:bg-muted/80 transition-colors">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] text-xs z-50">
                  {METRIC_EXPLANATIONS.confidence}
                </TooltipContent>
              </Tooltip>
            </div>
            <div>
              <p className="text-sm font-medium leading-snug text-muted-foreground">Confidence</p>
              <p className="text-2xl font-bold text-foreground">{confidenceScore.toFixed(1)}</p>
              <p className={`mt-1 text-xs ${confidenceChange >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {confidenceChange >= 0 ? "+" : ""}{confidenceChange.toFixed(1)} vs last month
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
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
  hourlyRate?: number
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

export function AdminStatCards({ data: s, targets, hoursMetrics, hourlyRate = 75 }: AdminStatCardsProps) {
  // Defensive: ensure s exists and has required properties
  if (!s) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <p className="text-sm text-muted-foreground">Loading stats...</p>
      </div>
    )
  }
  
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

  // Helper to format change text - show "First data" if no previous data exists
  const formatHoursChange = (change: number, lastMonth: number) => {
    // If last month was 0, this is first data or no comparison available
    if (lastMonth === 0) {
      return "First data this period"
    }
    return change >= 0 
      ? `+${formatHours(change)} from last month`
      : `${formatHours(change)} from last month`
  }
  
  const formatConfidenceChange = (change: number, lastMonth: number) => {
    if (lastMonth === 0) {
      return "First data this period"
    }
    return change >= 0 
      ? `+${change.toFixed(1)} from last month`
      : `${change.toFixed(1)} from last month`
  }

  // Hours-based cards when metrics available
  // Safely access hoursMetrics properties with defaults
  const h = hoursMetrics ?? {
    monthlyHours: 0,
    monthOverMonthChange: 0,
    lastMonthHours: 0,
    avgProductivityPercent: 0,
    fteEquivalent: 0,
    activeParticipants: 0,
    monthlyValue: 0,
    annualValue: 0,
    avgConfidence: 0,
    confidenceChange: 0,
    lastMonthConfidence: 0,
    thisMonthResponses: 0,
  }
  
  const adminCards = hoursMetrics ? [
    {
      label: "Hours Saved This Period",
      value: formatHours(h.monthlyHours ?? 0),
      change: formatHoursChange(h.monthOverMonthChange ?? 0, h.lastMonthHours ?? 0),
      icon: Clock,
      positive: (h.lastMonthHours ?? 0) === 0 || (h.monthOverMonthChange ?? 0) >= 0,
      explanation: METRIC_EXPLANATIONS.totalHoursSaved,
    },
    {
      label: "Productivity Gain",
      value: `${(h.avgProductivityPercent ?? 0).toFixed(1)}%`,
      change: `${(h.fteEquivalent ?? 0).toFixed(1)} FTE equivalent (${h.activeParticipants ?? 0} people)`,
      icon: Gauge,
      positive: true,
      explanation: METRIC_EXPLANATIONS.productivityGain,
    },
    {
      label: "Value Created",
      value: formatValue(h.monthlyValue ?? 0),
      change: `${formatValue(h.annualValue ?? 0)} annual run rate`,
      icon: DollarSign,
      positive: true,
      explanation: METRIC_EXPLANATIONS.valueCreated(hourlyRate),
    },
    {
      label: "Avg Confidence",
      value: (h.avgConfidence ?? 0).toFixed(1),
      change: formatConfidenceChange(h.confidenceChange ?? 0, h.lastMonthConfidence ?? 0),
      icon: Target,
      positive: (h.lastMonthConfidence ?? 0) === 0 || (h.confidenceChange ?? 0) >= 0,
      explanation: METRIC_EXPLANATIONS.avgConfidence,
    },
    {
      label: "Active Participants",
      value: (h.activeParticipants ?? 0).toLocaleString(),
      change: `${h.thisMonthResponses ?? 0} scorecards this month`,
      icon: Users,
      positive: true,
      explanation: METRIC_EXPLANATIONS.activeParticipants,
    },
  ] : [
    // Fallback to traditional metrics if hours not available
    {
      label: "Completion Rate",
      value: `${s.completionRate}%`,
      change: completionVs.text,
      icon: CheckCircle2,
      positive: completionVs.positive,
      explanation: METRIC_EXPLANATIONS.completionRate,
    },
    {
      label: "Active Users",
      value: Number(s.activeUsers ?? 0).toLocaleString(),
      change: usersVs.text,
      icon: Users,
      positive: usersVs.positive,
      explanation: METRIC_EXPLANATIONS.activeUsers,
    },
    {
      label: "Scorecards Sent",
      value: Number(s.scorecardsSent ?? 0).toLocaleString(),
      change: sentVs.text,
      icon: Send,
      positive: sentVs.positive,
      explanation: METRIC_EXPLANATIONS.scorecardsSent,
    },
    {
      label: "Organizations",
      value: String(s.totalOrgs ?? 0),
      change: `${s.totalUsers ?? 0} total users`,
      icon: Building2,
      positive: true,
      explanation: METRIC_EXPLANATIONS.organizations,
    },
  ]

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {adminCards.map((stat, idx) => (
          <Card key={stat.label} className="relative min-h-[140px] border-border/50 bg-card/80 backdrop-blur-sm">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${adminGradients[idx]} via-transparent to-transparent`} />
            <CardContent className="relative flex h-full items-start gap-4 p-5">
              <div className="flex flex-col items-center gap-2">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${adminIconColors[idx].bg}`}>
                  <stat.icon className={`h-5 w-5 ${adminIconColors[idx].text}`} />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border hover:bg-muted/80 transition-colors">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] text-xs z-50">
                    {stat.explanation}
                  </TooltipContent>
                </Tooltip>
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
    </TooltipProvider>
  )
}
