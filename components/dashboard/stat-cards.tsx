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

interface AdminStatCardsProps {
  data: AdminStats
}

const TARGET_SCORE = 7.0

export function AdminStatCards({ data: s }: AdminStatCardsProps) {
  const gap = TARGET_SCORE - s.avgScore
  const scoreChangeText =
    gap > 0
      ? `${gap.toFixed(1)} below target (${TARGET_SCORE})`
      : gap === 0
        ? `On target (${TARGET_SCORE})`
        : `${Math.abs(gap).toFixed(1)} above target (${TARGET_SCORE})`

  const adminCards = [
    {
      label: "Avg Score (Global)",
      value: s.avgScore.toFixed(1),
      change: scoreChangeText,
      icon: BarChart3,
      positive: gap <= 0,
    },
    {
      label: "Completion Rate",
      value: `${s.completionRate}%`,
      change: `+${s.completionRateChange}% from last period`,
      icon: CheckCircle2,
    },
    {
      label: "Active Users",
      value: s.activeUsers.toLocaleString(),
      change: `+${s.activeUsersChange} new this period`,
      icon: Users,
    },
    {
      label: "Scorecards Sent",
      value: s.scorecardsSent.toLocaleString(),
      change: `+${s.scorecardsSentChange} this period`,
      icon: Send,
    },
    {
      label: "Organizations",
      value: s.totalOrgs.toString(),
      change: `${s.totalUsers} total users`,
      icon: Building2,
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
              <p className={`mt-0.5 text-xs ${"positive" in stat && stat.positive === false ? "text-amber-600" : "text-success"}`}>
                {stat.change}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
