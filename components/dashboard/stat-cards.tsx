"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Flame, CheckCircle2, Target, Building2, Users, BarChart3, Send } from "lucide-react"
import type { AdminStats } from "@/lib/dashboard-data"

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
    streak >= 8 ? "text-red-500" :
    streak >= 4 ? "text-orange-500" :
    streak >= 2 ? "text-amber-500" :
    "text-muted-foreground"

  const streakBg =
    streak >= 8 ? "bg-red-500/10" :
    streak >= 4 ? "bg-orange-500/10" :
    streak >= 2 ? "bg-amber-500/10" :
    "bg-muted"

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Average Score -- with all 3 references */}
      <Card className="min-h-[120px]">
        <CardContent className="flex h-full items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium leading-snug text-muted-foreground">Average Score</p>
            <p className="text-2xl font-bold text-foreground">{avgScore.toFixed(1)}</p>
            <div className="mt-1 flex flex-col gap-0.5">
              <p className={`text-[11px] ${scoreDiff >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {scoreDiff >= 0 ? "+" : ""}{scoreDiff.toFixed(1)} vs last month
              </p>
              <p className={`text-[11px] ${vsField >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {vsField >= 0 ? "+" : ""}{vsField.toFixed(1)} vs field ({fieldAverage.toFixed(1)})
              </p>
              <p className={`text-[11px] ${vsGoal >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {vsGoal >= 0 ? "+" : ""}{vsGoal.toFixed(1)} vs goal ({myGoal.toFixed(1)})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak -- visual flame element */}
      <Card className="min-h-[120px]">
        <CardContent className="flex h-full items-start gap-4 p-5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${streakBg}`}>
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

      {/* Completed -- clarified as scorecard sections */}
      <Card className="min-h-[120px]">
        <CardContent className="flex h-full items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium leading-snug text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-foreground">{completedSections}<span className="text-base text-muted-foreground">/{totalSections}</span></p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              scorecard sections this period
            </p>
            {completedSections === totalSections && (
              <p className="mt-0.5 text-[11px] text-emerald-600 font-medium">All sections complete!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Percentile rank */}
      <Card className="min-h-[120px]">
        <CardContent className="flex h-full items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium leading-snug text-muted-foreground">Your Rank</p>
            <p className="text-2xl font-bold text-foreground">{percentile}<span className="text-sm text-muted-foreground">th</span></p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              percentile in your company
            </p>
            {percentile >= 75 && (
              <p className="mt-0.5 text-[11px] text-emerald-600 font-medium">Top quartile performer</p>
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
