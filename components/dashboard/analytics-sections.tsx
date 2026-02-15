"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Flame,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  UserX,
  Building2,
} from "lucide-react"
import type {
  UserStreak,
  NonResponder,
  ScoreVelocity,
  DepartmentVariance,
  QuestionCorrelation,
  DeptOverTime,
  OrgBenchmark,
  ThresholdAlert,
} from "@/lib/dashboard-data"

// ── Streaks ───────────────────────────────────────────────────────────
export function StreaksCard({ data }: { data: UserStreak[] }) {
  const top = data.slice(0, 8)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Flame className="h-4 w-4 text-orange-500" />
          Response Streaks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No streak data yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {top.map((s) => (
              <div key={s.userId} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.department}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{s.currentStreak}w</p>
                    <p className="text-[10px] text-muted-foreground">current</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">{s.maxStreak}w</p>
                    <p className="text-[10px] text-muted-foreground">best</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Non-responders ────────────────────────────────────────────────────
export function NonRespondersCard({ data }: { data: NonResponder[] }) {
  const top = data.slice(0, 8)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <UserX className="h-4 w-4 text-destructive" />
          Non-Responders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Everyone responded!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {top.map((n) => (
              <div key={n.userId} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{n.name}</p>
                  <p className="text-xs text-muted-foreground">{n.orgName} / {n.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-destructive">{n.missedWeeks} missed</p>
                  <p className="text-[10px] text-muted-foreground">Last: {n.lastResponseWeek === "Never" ? "Never" : `Week ${n.lastResponseWeek}`}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Score velocity ────────────────────────────────────────────────────
export function ScoreVelocityCard({ data }: { data: ScoreVelocity[] }) {
  const improving = data.filter((d) => d.velocity > 0).slice(0, 5)
  const declining = data.filter((d) => d.velocity < 0).slice(0, 5)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Score Velocity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-success">
              <TrendingUp className="h-3 w-3" /> Improving
            </p>
            <div className="flex flex-col gap-1.5">
              {improving.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : improving.map((v) => (
                <div key={v.userId} className="flex items-center justify-between text-xs">
                  <span className="truncate text-foreground">{v.name}</span>
                  <span className="ml-2 shrink-0 font-mono font-bold text-success">+{v.velocity}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-destructive">
              <TrendingDown className="h-3 w-3" /> Declining
            </p>
            <div className="flex flex-col gap-1.5">
              {declining.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : declining.map((v) => (
                <div key={v.userId} className="flex items-center justify-between text-xs">
                  <span className="truncate text-foreground">{v.name}</span>
                  <span className="ml-2 shrink-0 font-mono font-bold text-destructive">{v.velocity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Department variance ───────────────────────────────────────────────
export function DepartmentVarianceCard({ data }: { data: DepartmentVariance[] }) {
  const chartData = data.map((d) => ({ name: d.department, avg: d.avgScore, stdDev: d.stdDev }))
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Department Score Variance</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 3]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="stdDev" name="Std Dev" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── Question correlations ─────────────────────────────────────────────
export function QuestionCorrelationsCard({ data }: { data: QuestionCorrelation[] }) {
  const top = data.slice(0, 6)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Question Correlations</CardTitle>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Not enough data for correlations</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {top.map((c, i) => (
              <div key={i} className="flex items-start gap-3 rounded-md border border-border px-3 py-2">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  c.correlation > 0.5 ? "bg-success/10 text-success" : c.correlation < -0.3 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                }`}>
                  {c.correlation > 0 ? "+" : ""}{c.correlation}
                </div>
                <div className="min-w-0">
                  <p className="text-xs leading-snug text-foreground">{c.question1.slice(0, 60)}{c.question1.length > 60 ? "..." : ""}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">&amp; {c.question2.slice(0, 60)}{c.question2.length > 60 ? "..." : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Dept over time ────────────────────────────────────────────────────
const DEPT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
]

export function DeptOverTimeChart({ data }: { data: DeptOverTime[] }) {
  if (data.length === 0) return null
  const departments = Object.keys(data[0] || {}).filter((k) => k !== "week")
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Department Comparison Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {departments.map((dept, i) => (
              <Line key={dept} type="monotone" dataKey={dept} stroke={DEPT_COLORS[i % DEPT_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ── Org benchmarks ────────────────────────────────────────────────────
export function OrgBenchmarkCard({ data }: { data: OrgBenchmark[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4 text-primary" />
          Cross-Organization Benchmarks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No benchmark data</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.map((o) => (
              <div key={o.orgName} className="rounded-lg border border-border p-3">
                <p className="text-sm font-semibold text-foreground">{o.orgName}</p>
                <div className="mt-2 flex items-end gap-3">
                  <div>
                    <p className="text-2xl font-bold text-primary">{o.avgScore}</p>
                    <p className="text-[10px] text-muted-foreground">avg score</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{o.responseRate}%</p>
                    <p className="text-[10px] text-muted-foreground">response rate</p>
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{o.totalResponses} responses / {o.userCount} users</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Alerts ─────────────────────────────────────────────────────────────
export function AlertsCard({ data }: { data: ThresholdAlert[] }) {
  return (
    <Card>
      <CardContent className="pt-4">
        {data.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">No alerts at this time</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                a.severity === "critical" ? "border-destructive/30 bg-destructive/5" : "border-orange-300/30 bg-orange-50 dark:bg-orange-950/10"
              }`}>
                {a.severity === "critical" ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.entityType === "department" ? "Department" : "User"} alert
                  </p>
                </div>
                <Badge variant={a.severity === "critical" ? "destructive" : "secondary"} className="ml-auto shrink-0 capitalize text-[10px]">
                  {a.severity}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
