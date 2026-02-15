"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Flame, TrendingUp, TrendingDown, Minus, Target } from "lucide-react"
import type {
  UserPersonalStreak,
  PersonalTrendPoint,
  PersonalVsBenchmark,
} from "@/lib/dashboard-data"

// ── Personal Streak Card ──────────────────────────────────────────────
export function PersonalStreakCard({ data }: { data: UserPersonalStreak }) {
  const streakEmoji =
    data.currentStreak >= 4 ? "text-orange-500" :
    data.currentStreak >= 2 ? "text-amber-500" :
    "text-muted-foreground"

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Flame className={`h-4 w-4 ${streakEmoji}`} />
          Your Response Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-6">
          <div>
            <p className="text-4xl font-bold text-foreground">
              {data.currentStreak}
            </p>
            <p className="text-xs text-muted-foreground">
              week{data.currentStreak !== 1 ? "s" : ""} in a row
            </p>
          </div>
          <div className="flex gap-6 pb-1">
            <div>
              <p className="text-lg font-semibold text-foreground">{data.maxStreak}</p>
              <p className="text-[10px] text-muted-foreground">personal best</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {data.totalWeeks > 0
                  ? Math.round((data.totalResponses / data.totalWeeks) * 100)
                  : 0}%
              </p>
              <p className="text-[10px] text-muted-foreground">response rate</p>
            </div>
          </div>
        </div>
        {data.currentStreak >= 2 && (
          <div className="mt-3 rounded-md bg-primary/5 px-3 py-2">
            <p className="text-xs font-medium text-primary">
              {data.currentStreak >= 4
                ? "Incredible consistency! Keep the momentum going."
                : "Nice streak! One more week to build a strong habit."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── You vs. Benchmark Card ────────────────────────────────────────────
export function PersonalBenchmarkCard({ data }: { data: PersonalVsBenchmark }) {
  const VelocityIcon =
    data.myVelocity > 0.1 ? TrendingUp :
    data.myVelocity < -0.1 ? TrendingDown :
    Minus

  const velocityColor =
    data.myVelocity > 0.1 ? "text-success" :
    data.myVelocity < -0.1 ? "text-destructive" :
    "text-muted-foreground"

  const velocityLabel =
    data.myVelocity > 0.1 ? "Improving" :
    data.myVelocity < -0.1 ? "Declining" :
    "Steady"

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-primary" />
          You vs. Average
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* My score */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{data.myAvg}</p>
            <p className="text-[10px] font-medium text-primary/70">Your Avg</p>
          </div>
          {/* Dept avg */}
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{data.deptAvg}</p>
            <p className="text-[10px] text-muted-foreground">{data.deptName} Avg</p>
          </div>
          {/* Org avg */}
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{data.orgAvg}</p>
            <p className="text-[10px] text-muted-foreground">Company Avg</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <VelocityIcon className={`h-4 w-4 ${velocityColor}`} />
            <div>
              <p className="text-xs font-medium text-foreground">{velocityLabel}</p>
              <p className="text-[10px] text-muted-foreground">
                {data.myVelocity > 0 ? "+" : ""}{data.myVelocity} pts/week
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{data.percentile}th</p>
            <p className="text-[10px] text-muted-foreground">percentile</p>
          </div>
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
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Your scores compared to anonymized department and company averages
        </p>
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
