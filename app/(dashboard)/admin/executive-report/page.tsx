"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Loader2, RefreshCcw, Calendar, Clock, TrendingUp, Trophy, Sparkles } from "lucide-react"
import type { WeeklyRollupSnapshot } from "@/lib/types"

function fmtInt(n: number) {
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "0"
}

function fmtPct(n: number, digits = 0) {
  if (!Number.isFinite(n)) return "0%"
  return `${n.toFixed(digits)}%`
}

function fmtMoney(n: number) {
  return `$${fmtInt(n)}`
}

function monthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map((x) => parseInt(x, 10))
  if (!y || !m) return yyyyMm
  const d = new Date(Date.UTC(y, m - 1, 1))
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export default function ExecutiveReportPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [snapshot, setSnapshot] = useState<WeeklyRollupSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  const orgId = useMemo(() => user?.organizationId || "", [user?.organizationId])

  async function loadLatest() {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/rollup-snapshots?organizationId=${encodeURIComponent(orgId)}`)
      const data = await res.json()
      setSnapshot(data.latest ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report.")
    } finally {
      setLoading(false)
    }
  }

  async function generateNow() {
    if (!orgId) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/rollup-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Generation failed")
      setSnapshot(data.snapshot as WeeklyRollupSnapshot)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.")
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    loadLatest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Executive Weekly Report</h1>
          <p className="mt-1 text-muted-foreground">
            A report-style TL;DR that mirrors the weekly leadership narrative.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadLatest} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={generateNow} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate snapshot
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!snapshot ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No executive snapshot yet. Click <strong>Generate snapshot</strong> to create the first report.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent" />
            <CardContent className="relative p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(snapshot.period.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" "}–{" "}
                      {new Date(snapshot.period.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold">{snapshot.organizationName}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Generated {new Date(snapshot.generatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {fmtInt(snapshot.headline.scorecards)} scorecards
                  </Badge>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-300">
                    {fmtInt(snapshot.headline.totalHoursSaved)} hours
                  </Badge>
                  <Badge variant="secondary" className="bg-violet-500/10 text-violet-200">
                    {fmtPct(snapshot.headline.avgProductivityPercent)}
                  </Badge>
                  <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-200">
                    {snapshot.headline.avgConfidence.toFixed(1)} / 10 confidence
                  </Badge>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-border/50 bg-transparent">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Hours reclaimed</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {fmtInt(snapshot.headline.totalHoursSaved)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Δ {snapshot.deltas.totalHoursSaved >= 0 ? "+" : ""}
                      {fmtInt(snapshot.deltas.totalHoursSaved)} vs prior snapshot
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-transparent">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Productivity</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {fmtPct(snapshot.headline.avgProductivityPercent)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Δ {snapshot.deltas.avgProductivityPercent >= 0 ? "+" : ""}
                      {snapshot.deltas.avgProductivityPercent.toFixed(1)} pts
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-transparent">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Annualized impact</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {fmtInt(snapshot.headline.annualRunRateHours)} hrs
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {snapshot.headline.fteEquivalent.toFixed(0)} FTE equivalent
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-transparent">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Annual value</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {fmtMoney(snapshot.headline.annualValue)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      at org hourly rate
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 rounded-xl border border-border/50 bg-muted/40 p-5">
                <p className="text-sm leading-relaxed text-foreground">
                  <span className="font-semibold">THE HEADLINE</span>{" "}
                  In this period, you reclaimed{" "}
                  <span className="font-semibold text-emerald-300">{fmtInt(snapshot.headline.totalHoursSaved)} hours</span>{" "}
                  across{" "}
                  <span className="font-semibold">{fmtInt(snapshot.headline.scorecards)} scorecards</span>, at{" "}
                  <span className="font-semibold text-violet-200">{fmtPct(snapshot.headline.avgProductivityPercent)}</span>{" "}
                  average productivity and{" "}
                  <span className="font-semibold text-cyan-200">{snapshot.headline.avgConfidence.toFixed(1)} / 10</span>{" "}
                  confidence.
                </p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="trend" className="space-y-6">
            <TabsList>
              <TabsTrigger value="trend" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Trend
              </TabsTrigger>
              <TabsTrigger value="regions" className="gap-2">
                <Calendar className="h-4 w-4" />
                Regions
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-2">
                <Trophy className="h-4 w-4" />
                Top 50
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trend">
              <Card>
                <CardHeader>
                  <CardTitle>THE TREND</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Last {snapshot.trend.length} months (monthly-equivalent hours).
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    {snapshot.trend.map((m) => (
                      <div key={m.bucket} className="rounded-lg border border-border/50 p-4">
                        <p className="text-xs text-muted-foreground">{monthLabel(m.bucket)}</p>
                        <p className="mt-1 text-xl font-semibold">{fmtInt(m.totalHoursSaved)} hrs</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtInt(m.scorecards)} scorecards · {fmtPct(m.avgProductivityPercent)} · {m.avgConfidence.toFixed(1)} conf
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/40 p-5">
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold">Pull quote:</span>{" "}
                      The line isn’t flattening — it’s accelerating.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="regions">
              <Card>
                <CardHeader>
                  <CardTitle>THE REGIONS</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Top departments by productivity (this period).
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {snapshot.regions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No department breakdown available.</p>
                  ) : (
                    <div className="space-y-2">
                      {snapshot.regions.map((r, idx) => (
                        <div key={`${r.department}-${idx}`} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                          <div>
                            <p className="text-sm font-medium">{r.department}</p>
                            <p className="text-xs text-muted-foreground">
                              {fmtInt(r.scorecards)} scorecards · {r.avgConfidence.toFixed(1)} confidence
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{fmtPct(r.avgProductivityPercent)}</p>
                            <p className="text-xs text-muted-foreground">{fmtInt(r.totalHoursSaved)} hrs</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaderboard">
              <Card>
                <CardHeader>
                  <CardTitle>THE LEADERBOARD</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Top performers (monthly-equivalent hours) for this period.
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {snapshot.leaderboard.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No leaderboard data yet.</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {snapshot.leaderboard.map((p, i) => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.department}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{p.avgScore.toFixed(1)} mo. hrs</p>
                            <p className="text-xs text-muted-foreground">{p.streak}w streak</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

