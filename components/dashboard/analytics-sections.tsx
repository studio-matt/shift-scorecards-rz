"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useBackground } from "@/lib/background-context"
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
  Download,
  FileText,
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
  FieldReportData,
} from "@/lib/dashboard-data"

// ── Streaks ───────────────────────────────────────────────────────────
function FlameIcon({ streak }: { streak: number }) {
  // Flame grows: small (1-2), medium (3-5), large (6+)
  const size = streak >= 6 ? "h-6 w-6" : streak >= 3 ? "h-5 w-5" : "h-4 w-4"
  const color =
    streak >= 6
      ? "text-orange-500"
      : streak >= 3
        ? "text-orange-400"
        : "text-orange-300"
  return <Flame className={`${size} ${color} shrink-0`} />
}

export function StreaksCard({ data }: { data: UserStreak[] }) {
  const top = data.slice(0, 8)
  // Max streak across all users for bar scaling
  const maxW = Math.max(...top.map((s) => s.maxStreak), 1)
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Flame className="h-4 w-4 text-orange-400" />
          Response Streaks
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {top.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No streak data yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {top.map((s) => {
              const pct = Math.round((s.currentStreak / maxW) * 100)
              return (
                <div key={s.userId} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FlameIcon streak={s.currentStreak} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.department}</p>
                      </div>
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
                  {/* Streak bar */}
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-300 to-orange-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Non-responders ────────────────────────────────────────────────────
export function NonRespondersCard({ data }: { data: NonResponder[] }) {
  const neverStarted = data.filter((n) => n.lastResponseWeek === "Never").slice(0, 6)
  const droppedOff = data.filter((n) => n.lastResponseWeek !== "Never").slice(0, 6)

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <UserX className="h-4 w-4 text-destructive" />
          Non-Responders
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {data.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Everyone responded!</p>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Dropped Off */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Dropped Off</p>
                <Badge variant="secondary" className="ml-auto text-[10px]">{droppedOff.length}</Badge>
              </div>
              {droppedOff.length === 0 ? (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">No drop-offs detected</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {droppedOff.map((n) => (
                    <div key={n.userId} className="flex items-center justify-between rounded-md border border-orange-200 bg-orange-50/50 px-3 py-2 dark:border-orange-900/30 dark:bg-orange-950/10">
                      <div>
                        <p className="text-sm font-medium text-foreground">{n.name}</p>
                        <p className="text-xs text-muted-foreground">{n.orgName} / {n.department}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600">{n.missedWeeks} missed</p>
                        <p className="text-[10px] text-muted-foreground">Last: Week {n.lastResponseWeek}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Never Started */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Never Started</p>
                <Badge variant="secondary" className="ml-auto text-[10px]">{neverStarted.length}</Badge>
              </div>
              {neverStarted.length === 0 ? (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">All users have submitted at least once</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {neverStarted.map((n) => (
                    <div key={n.userId} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{n.name}</p>
                        <p className="text-xs text-muted-foreground">{n.orgName} / {n.department}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Onboarding</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-3">
        <CardTitle className="text-sm font-semibold">Score Velocity</CardTitle>
      </CardHeader>
      <CardContent className="relative">
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
interface VarianceFeedbackSettings {
  highVarianceThreshold?: number
  lowVarianceThreshold?: number
  highVarianceMessage?: string
  lowVarianceMessage?: string
  balancedMessage?: string
}

function generateVarianceInsight(d: DepartmentVariance, settings?: VarianceFeedbackSettings): string {
  const highThreshold = settings?.highVarianceThreshold ?? 1.5
  const lowThreshold = settings?.lowVarianceThreshold ?? 0.5

  if (d.stdDev >= highThreshold) {
    const tpl = settings?.highVarianceMessage ?? "{dept} has the widest performance spread. {high} high performer(s), {low} need support."
    return tpl
      .replace("{dept}", d.department)
      .replace("{high}", String(d.highPerformers))
      .replace("{low}", String(d.needsSupport))
      .replace("{stdDev}", String(d.stdDev))
      .replace("{total}", String(d.totalUsers))
  }
  if (d.stdDev <= lowThreshold) {
    const tpl = settings?.balancedMessage ?? "{dept} is tightly aligned -- scores are consistent across the team."
    return tpl
      .replace("{dept}", d.department)
      .replace("{high}", String(d.highPerformers))
      .replace("{low}", String(d.needsSupport))
      .replace("{stdDev}", String(d.stdDev))
      .replace("{total}", String(d.totalUsers))
  }
  const tpl = settings?.lowVarianceMessage ?? "{dept}: moderate spread with {high} strong and {low} needing attention."
  return tpl
    .replace("{dept}", d.department)
    .replace("{high}", String(d.highPerformers))
    .replace("{low}", String(d.needsSupport))
    .replace("{stdDev}", String(d.stdDev))
    .replace("{total}", String(d.totalUsers))
}

export function DepartmentVarianceCard({ data, feedbackSettings }: { data: DepartmentVariance[]; feedbackSettings?: VarianceFeedbackSettings }) {
  const { accentColor } = useBackground()
  const chartData = data.map((d) => ({ name: d.department, avg: d.avgScore, stdDev: d.stdDev }))
  const highThreshold = feedbackSettings?.highVarianceThreshold ?? 1.5
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-3">
        <CardTitle className="text-sm font-semibold">Department Score Variance</CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {chartData.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No data yet</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 3]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="stdDev" name="Std Dev" fill={accentColor} radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-col gap-1.5">
              {data.map((d) => (
                <div
                  key={d.department}
                  className={`rounded-md px-3 py-1.5 text-xs leading-relaxed ${
                    d.stdDev >= highThreshold
                      ? "border border-orange-200 bg-orange-50/60 text-orange-800 dark:border-orange-900/30 dark:bg-orange-950/10 dark:text-orange-300"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {generateVarianceInsight(d, feedbackSettings)}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Question correlations ─────────────────────────────────────────────
function generateCorrelationInsight(c: QuestionCorrelation): string | null {
  const q1Short = c.question1.length > 40 ? c.question1.slice(0, 40).trim() + "..." : c.question1
  const q2Short = c.question2.length > 40 ? c.question2.slice(0, 40).trim() + "..." : c.question2
  if (c.correlation >= 0.7) {
    return `Strong link: Teams that score high on "${q1Short.toLowerCase()}" also score high on "${q2Short.toLowerCase()}." Investing in one lifts both.`
  }
  if (c.correlation >= 0.5) {
    return `Moderate link between "${q1Short.toLowerCase()}" and "${q2Short.toLowerCase()}." Consider coaching strategies that address both together.`
  }
  if (c.correlation <= -0.5) {
    return `Inverse relationship: as "${q1Short.toLowerCase()}" improves, "${q2Short.toLowerCase()}" tends to drop. Investigate potential trade-offs.`
  }
  return null
}

export function QuestionCorrelationsCard({ data }: { data: QuestionCorrelation[] }) {
  const top = data.slice(0, 6)
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-3">
        <CardTitle className="text-sm font-semibold">Question Correlations</CardTitle>
        <p className="text-xs text-muted-foreground">Strongest relationships between scorecard questions</p>
      </CardHeader>
      <CardContent className="relative">
        {top.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Not enough data for correlations</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {top.map((c, i) => {
                const insight = generateCorrelationInsight(c)
                return (
                  <div key={i} className="flex flex-col gap-1.5 rounded-md border border-border px-3 py-2">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        c.correlation > 0.5 ? "bg-success/10 text-success" : c.correlation < -0.3 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                      }`}>
                        {c.correlation > 0 ? "+" : ""}{c.correlation}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs leading-snug text-foreground">{c.question1.slice(0, 60)}{c.question1.length > 60 ? "..." : ""}</p>
                        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{"& "}{c.question2.slice(0, 60)}{c.question2.length > 60 ? "..." : ""}</p>
                      </div>
                    </div>
                    {insight && (
                      <p className="rounded bg-primary/5 px-2 py-1 text-[10px] leading-relaxed text-primary">
                        {insight}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Dept over time ────────────────────────────────────────────────────
function getSmartDeptSelection(data: DeptOverTime[]) {
  if (data.length === 0) return { top3: [] as string[], bottom3: [] as string[], all: [] as string[] }
  const departments = Object.keys(data[0] || {}).filter((k) => k !== "week")
  // Compute each dept's overall avg from the last data point (most recent)
  const lastRow = data[data.length - 1]
  const scored = departments
    .map((d) => ({ dept: d, score: typeof lastRow[d] === "number" ? (lastRow[d] as number) : 0 }))
    .sort((a, b) => b.score - a.score)
  const top3 = scored.slice(0, 3).map((s) => s.dept)
  const bottom3 = scored.slice(-3).map((s) => s.dept)
  return { top3, bottom3, all: departments }
}

export function DeptOverTimeChart({ data }: { data: DeptOverTime[] }) {
  const { accentColor } = useBackground()
  const [showAll, setShowAll] = useState(false)
  const [toggledDepts, setToggledDepts] = useState<Set<string> | null>(null)

  // Use accent color as the first color in the palette
  const deptColors = [
    accentColor,
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#e45858",
    "#36a2eb",
    "#ff9f40",
  ]

  if (data.length === 0) return null
  const departments = Object.keys(data[0] || {}).filter((k) => k !== "week")
  const { top3, bottom3 } = getSmartDeptSelection(data)
  const defaultVisible = new Set([...top3, ...bottom3])
  const activeDepts = showAll
    ? departments
    : toggledDepts
      ? Array.from(toggledDepts)
      : Array.from(defaultVisible)

  // Zoomed Y-axis for clustered data
  const allScores: number[] = []
  for (const row of data) {
    for (const d of activeDepts) {
      const v = row[d]
      if (typeof v === "number" && v > 0) allScores.push(v)
    }
  }
  const minScore = allScores.length > 0 ? Math.min(...allScores) : 0
  const maxScore = allScores.length > 0 ? Math.max(...allScores) : 10
  const yMin = Math.max(0, Math.floor(minScore - 0.5))
  const yMax = Math.min(10, Math.ceil(maxScore + 0.5))

  function toggleDept(dept: string) {
    setShowAll(false)
    setToggledDepts((prev) => {
      const current = prev ?? new Set(defaultVisible)
      const next = new Set(current)
      if (next.has(dept)) {
        next.delete(dept)
      } else {
        next.add(dept)
      }
      return next
    })
  }

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Department Comparison Over Time</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Showing {activeDepts.length} of {departments.length} departments
              {!showAll && !toggledDepts && " (top 3 + bottom 3)"}
            </p>
          </div>
          {departments.length > 6 && (
            <button
              onClick={() => {
                setShowAll(!showAll)
                setToggledDepts(null)
              }}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              {showAll ? "Smart View" : "Show All"}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative">
        {/* Department toggles */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {departments.map((dept, i) => {
            const isActive = activeDepts.includes(dept)
            const isTop = top3.includes(dept)
            const isBottom = bottom3.includes(dept)
            return (
              <button
                key={dept}
                onClick={() => toggleDept(dept)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                  isActive
                    ? "border border-transparent bg-primary/10 text-foreground"
                    : "border border-border bg-muted/30 text-muted-foreground opacity-60"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: isActive ? deptColors[i % deptColors.length] : "hsl(var(--muted-foreground))",
                    opacity: isActive ? 1 : 0.3,
                  }}
                />
                {dept}
                {isActive && isTop && !isBottom && (
                  <TrendingUp className="h-2.5 w-2.5 text-success" />
                )}
                {isActive && isBottom && !isTop && (
                  <TrendingDown className="h-2.5 w-2.5 text-destructive" />
                )}
              </button>
            )
          })}
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {departments.map((dept, i) => (
              <Line
                key={dept}
                type="monotone"
                dataKey={dept}
                stroke={deptColors[i % deptColors.length]}
                strokeWidth={activeDepts.includes(dept) ? 2.5 : 0}
                dot={activeDepts.includes(dept) ? { r: 3 } : false}
                hide={!activeDepts.includes(dept)}
                name={dept}
              />
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
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4 text-primary" />
          Cross-Organization Benchmarks
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {data.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No benchmark data</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.map((o) => (
              <div key={o.orgName} className="rounded-lg border border-border/50 bg-muted/30 p-3">
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

// ── Field Report ─────────────────────────────────────────────────────
export function FieldReportCard({ data }: { data: FieldReportData | null }) {
  const reportRef = useRef<HTMLDivElement>(null)

  if (!data) return null

  function handleExport() {
    if (!data) return
    const lines: string[] = [
      `SHIFT FIELD REPORT`,
      `Generated: ${data.generatedAt}`,
      `Period: ${data.periodLabel}`,
      ``,
      `OVERVIEW`,
      `Across ${data.totalOrganizations} organizations and ${data.totalEmployees.toLocaleString()} employees, the overall average score was ${data.overallAvgScore}/10 with a ${data.avgResponseRate}% response rate. Total responses: ${data.totalResponses.toLocaleString()}.`,
      ``,
      `TOP SCORING CATEGORIES`,
      ...data.topCategories.map((c, i) => `  ${i + 1}. ${c.question} -- ${c.avgScore}/10`),
      ``,
      `AREAS FOR IMPROVEMENT`,
      ...data.bottomCategories.map((c, i) => `  ${i + 1}. ${c.question} -- ${c.avgScore}/10`),
      ``,
      `---`,
      `This report contains anonymized, aggregated data across all SHIFT organizations.`,
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `SHIFT-Field-Report-${data.generatedAt.replace(/\s/g, "-")}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card ref={reportRef} className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-sm font-semibold">Field Report</CardTitle>
              <p className="text-xs text-muted-foreground">Anonymized cross-organization intelligence -- the SHIFT thought leadership asset</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-border/50" onClick={handleExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm leading-relaxed text-foreground">
            Across <span className="font-bold">{data.totalOrganizations} organizations</span> and{" "}
            <span className="font-bold">{data.totalEmployees.toLocaleString()} employees</span>,
            the overall average score was{" "}
            <span className="font-bold text-primary">{data.overallAvgScore}/10</span> with a{" "}
            <span className="font-bold">{data.avgResponseRate}%</span> response rate.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.totalResponses.toLocaleString()} total responses &middot; {data.periodLabel}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-success">
              <TrendingUp className="h-3 w-3" /> Top Categories
            </p>
            <div className="flex flex-col gap-1.5">
              {data.topCategories.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5">
                  <span className="truncate text-xs text-foreground">{c.question}</span>
                  <span className="ml-2 shrink-0 text-xs font-bold text-success">{c.avgScore}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-orange-600">
              <TrendingDown className="h-3 w-3" /> Areas for Improvement
            </p>
            <div className="flex flex-col gap-1.5">
              {data.bottomCategories.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5">
                  <span className="truncate text-xs text-foreground">{c.question}</span>
                  <span className="ml-2 shrink-0 text-xs font-bold text-orange-600">{c.avgScore}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Generated {data.generatedAt} &middot; All data anonymized and aggregated
        </p>
      </CardContent>
    </Card>
  )
}

// ── Alerts ──────────────────────────────────────────────────────��──────
export function AlertsCard({ data }: { data: ThresholdAlert[] }) {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-transparent" />
      <CardContent className="relative pt-4">
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
