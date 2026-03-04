"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Flame, CheckCircle2, Target, Building2, Users, BarChart3, Send } from "lucide-react"
import type { AdminStats } from "@/lib/dashboard-data"

const userStats = [
  {
    label: "Average Score",
    value: "8.4",
    change: "+0.8 from last week",
    icon: TrendingUp,
    positive: true,
  },
  {
    label: "Streak",
    value: "12 Weeks",
    change: "Consecutive completions",
    icon: Flame,
    positive: true,
  },
  {
    label: "Completed This Week",
    value: "5 of 7",
    change: "Personal best",
    icon: CheckCircle2,
    positive: true,
  },
  {
    label: "Goals",
    value: "Last 12 Weeks",
    change: "+4% improvement",
    icon: Target,
    positive: true,
  },
]

export function StatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {userStats.map((stat) => (
        <Card key={stat.label} className="min-h-[120px]">
          <CardContent className="flex h-full items-start gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <stat.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium leading-snug text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {stat.value}
              </p>
              <p className="mt-0.5 text-xs text-success">
                {stat.change}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
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
}

export function AdminStatCards({ data: s, targets }: AdminStatCardsProps) {
  const tAvgScore = targets?.avgScore ?? 7.0
  const tCompletionRate = targets?.completionRate ?? 85
  const tActiveUsers = targets?.activeUsers ?? 100
  const tScorecardsSent = targets?.scorecardsSent ?? 50

  const scoreGap = tAvgScore - s.avgScore
  const completionGap = tCompletionRate - s.completionRate
  const usersGap = tActiveUsers - s.activeUsers
  const sentGap = tScorecardsSent - s.scorecardsSent

  function vsTarget(actual: number, target: number, unit = "") {
    const diff = actual - target
    if (Math.abs(diff) < 0.05) return { text: `On target (${target}${unit})`, positive: true }
    if (diff > 0) return { text: `${diff.toFixed(unit === "%" ? 0 : 1)}${unit} above target (${target}${unit})`, positive: true }
    return { text: `${Math.abs(diff).toFixed(unit === "%" ? 0 : 1)}${unit} below target (${target}${unit})`, positive: false }
  }

  const scoreVs = vsTarget(s.avgScore, tAvgScore)
  const completionVs = vsTarget(s.completionRate, tCompletionRate, "%")
  const usersVs = vsTarget(s.activeUsers, tActiveUsers)
  const sentVs = vsTarget(s.scorecardsSent, tScorecardsSent)

  const adminCards = [
    {
      label: "Avg Score (Global)",
      value: s.avgScore.toFixed(1),
      change: scoreVs.text,
      icon: BarChart3,
      positive: scoreVs.positive,
    },
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
      {adminCards.map((stat) => (
        <Card key={stat.label} className="min-h-[120px]">
          <CardContent className="flex h-full items-start gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <stat.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {stat.value}
              </p>
              <p className={`mt-0.5 text-xs ${stat.positive === false ? "text-amber-600" : "text-success"}`}>
                {stat.change}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
