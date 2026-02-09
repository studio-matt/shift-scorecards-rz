"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Flame, CheckCircle2, Target } from "lucide-react"

const stats = [
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
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <stat.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
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
