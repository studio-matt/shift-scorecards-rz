"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useBackground } from "@/lib/background-context"
import type { WeeklyTrend } from "@/lib/types"
import type { WeeklyHoursTrend } from "@/lib/dashboard-data"

interface WeeklyTrendChartProps {
  data: WeeklyTrend[]
  targetScore?: number
  fieldAverage?: number
}

export function WeeklyTrendChart({ data, targetScore = 7.0, fieldAverage = 6.2 }: WeeklyTrendChartProps) {
  const { accentColor } = useBackground()
  if (data.length === 0) {
    return (
      <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="text-base font-semibold">
            Score Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No trend data available yet
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Compute month-over-month delta
  const latest = data[data.length - 1]?.score ?? 0
  const earliest = data[0]?.score ?? 0
  const delta = latest - earliest
  const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)

  // Zoomed Y-axis: don't start at 0, show movement
  const scores = data.map((d) => d.score)
  const minScore = Math.min(...scores, fieldAverage, targetScore)
  const maxScore = Math.max(...scores, fieldAverage, targetScore)
  const yMin = Math.max(0, Math.floor(minScore - 1))
  const yMax = Math.min(10, Math.ceil(maxScore + 1))

  // Add field average to each data point for the line
  const enriched = data.map((d) => ({
    ...d,
    fieldAverage,
  }))

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold">
            Score Trend - Last {data.length} Weeks
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Period change:{" "}
            <span className={delta >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-red-400"}>
              {deltaStr}
            </span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={enriched}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={28}
                wrapperStyle={{ fontSize: 11 }}
              />
              {/* Target line */}
              <ReferenceLine
                y={targetScore}
                stroke="hsl(var(--success))"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: `Target ${targetScore}`,
                  position: "right",
                  fill: "hsl(var(--success))",
                  fontSize: 10,
                }}
              />
              {/* Field average line */}
              <Line
                type="monotone"
                dataKey="fieldAverage"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                name="Field Average"
              />
              {/* Actual score line - uses org accent color */}
              <Line
                type="monotone"
                dataKey="score"
                stroke={accentColor}
                strokeWidth={2.5}
                dot={{ fill: accentColor, r: 4 }}
                activeDot={{ r: 6 }}
                name="Your Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Hours Saved Trend Chart ────────────────────────────────────────────
interface HoursTrendChartProps {
  data: WeeklyHoursTrend[]
}

export function HoursTrendChart({ data }: HoursTrendChartProps) {
  const { accentColor } = useBackground()
  
  if (data.length === 0) {
    return (
      <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="text-base font-semibold">
            Hours Saved Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No hours data available yet
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Compute totals (coerce in case API/aggregate mapping omits `hours`)
  const totalHours = data.reduce((sum, d) => sum + (d.hours ?? 0), 0)
  const totalResponses = data.reduce((sum, d) => sum + (d.responses ?? 0), 0)
  const latestHours = data[data.length - 1]?.hours ?? 0
  const earliestHours = data[0]?.hours ?? 0
  const delta = latestHours - earliestHours
  const deltaPercent = earliestHours > 0 ? ((delta / earliestHours) * 100) : 0

  // Format helpers
  const formatHours = (hrs: number) =>
    Number.isFinite(hrs) && hrs >= 1000 ? `${(hrs / 1000).toFixed(1)}K` : String(Math.round(Number.isFinite(hrs) ? hrs : 0))
  
  // Format labels as dates (e.g., "April 13, 2026") for clarity
  const formatWeekLabel = (week: string) => {
    if (week == null || week === "") return ""
    // If it's a date string, format as readable date
    if (week.includes("-") || week.includes("/")) {
      const date = new Date(week)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      }
    }
    // If already formatted like "W10" or "Week 10", keep as-is but label as month period
    const weekMatch = week.match(/^W?(\d+)$/i)
    if (weekMatch) {
      return `Period ${weekMatch[1]}`
    }
    return week
  }
  
  // Transform data to use formatted week labels
  const chartData = data.map(d => ({
    ...d,
    hours: d.hours ?? 0,
    weekLabel: formatWeekLabel(d.week ?? ""),
  }))

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent" />
      <CardHeader className="relative flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold">
            Monthly Hours Saved Trend - Last {data.length} Months
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{formatHours(totalHours)} hrs/month</span>
            {" "}from {totalResponses} scorecards
            {delta !== 0 && (
              <span className={delta >= 0 ? "ml-2 text-emerald-400" : "ml-2 text-red-400"}>
                ({delta >= 0 ? "+" : ""}{deltaPercent.toFixed(0)}% growth)
              </span>
            )}
          </p>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                tickFormatter={(val) => `${Math.round(val)}`}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
                formatter={(value: number) => [`${Math.round(value)} hrs`, "Hours Saved"]}
                labelFormatter={(label) => label}
              />
              <Legend
                verticalAlign="bottom"
                height={28}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar
                dataKey="hours"
                fill={accentColor || "hsl(var(--primary))"}
                radius={[4, 4, 0, 0]}
                name="Hours Saved"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
