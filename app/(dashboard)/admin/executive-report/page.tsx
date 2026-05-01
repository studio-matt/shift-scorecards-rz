"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { authHeaders } from "@/lib/api-client"
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

function weekLabel(mondayYyyyMmDd: string) {
  const d = new Date(mondayYyyyMmDd + "T12:00:00Z")
  if (Number.isNaN(d.getTime())) return mondayYyyyMmDd
  return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
}

function ExecutiveReportInner() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const snapshotFromUrl = searchParams.get("snapshot")

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [snapshot, setSnapshot] = useState<WeeklyRollupSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  const orgId = useMemo(() => user?.organizationId || "", [user?.organizationId])

  async function loadLatest() {
    setLoading(true)
    setError(null)
    try {
      const headers = await authHeaders()
      let url: string
      if (snapshotFromUrl) {
        url = `/api/rollup-snapshots?snapshot=${encodeURIComponent(snapshotFromUrl)}`
      } else {
        if (!orgId) {
          setError("Sign in as an admin with an organization, or open a snapshot link from email.")
          setSnapshot(null)
          return
        }
        url = `/api/rollup-snapshots?organizationId=${encodeURIComponent(orgId)}`
      }
      const res = await fetch(url, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load report.")
      const snap = (snapshotFromUrl ? data.snapshot : data.latest) as WeeklyRollupSnapshot | null
      setSnapshot(snap ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report.")
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }

  async function generateNow() {
    if (!orgId) return
    setGenerating(true)
    setError(null)
    try {
      const headers = await authHeaders({
        "Content-Type": "application/json",
      })
      const res = await fetch("/api/rollup-snapshots", {
        method: "POST",
        headers,
        body: JSON.stringify({ organizationId: orgId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Generation failed.")
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
  }, [orgId, snapshotFromUrl])

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
            Snapshot v2 from <code className="rounded bg-muted px-1 text-xs">/aggregates</code> — CEO-style TL;DR.
          </p>
          {snapshotFromUrl && snapshot && (
            <p className="mt-2 text-xs text-muted-foreground">
              Linked snapshot <Badge variant="outline">{snapshot.id}</Badge> · v{snapshot.scheduleVersion ?? 1}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadLatest} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          {orgId && (
            <Button onClick={generateNow} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate snapshot
            </Button>
          )}
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
              No rollup snapshot yet. Use <strong>Generate snapshot</strong> or open an email link with{" "}
              <code className="rounded bg-muted px-1 text-xs">?snapshot=…</code>.
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
                      {new Date(snapshot.period.startDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {" "}–{" "}
                      {new Date(snapshot.period.endDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
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
                    <p className="mt-1 text-xs text-muted-foreground">at org hourly rate</p>
                  </CardContent>
                </Card>
              </div>

              {snapshot.pullQuotes && snapshot.pullQuotes.length > 0 && (
                <div className="mt-6 space-y-3">
                  {snapshot.pullQuotes.map((q, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-transparent to-violet-500/10 p-5"
                    >
                      <p className="text-sm font-medium leading-relaxed text-foreground">{q}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="trend" className="space-y-6">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="trend" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Trend (monthly)
              </TabsTrigger>
              <TabsTrigger value="trendWeekly" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Trend (weekly)
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
                    Last {snapshot.trend.length} months (monthly-equivalent hours from aggregates).
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    {snapshot.trend.map((m) => (
                      <div key={m.bucket} className="rounded-lg border border-border/50 p-4">
                        <p className="text-xs text-muted-foreground">{monthLabel(m.bucket)}</p>
                        <p className="mt-1 text-xl font-semibold">{fmtInt(m.totalHoursSaved)} hrs</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtInt(m.scorecards)} scorecards · {fmtPct(m.avgProductivityPercent)} ·{" "}
                          {m.avgConfidence.toFixed(1)} conf
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trendWeekly">
              <Card>
                <CardHeader>
                  <CardTitle>WEEKLY BUCKETS</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Calendar weeks (Monday start), up to 12 weeks from memorialized org-level aggregates.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!snapshot.trendWeekly?.length ? (
                    <p className="text-sm text-muted-foreground">No weekly buckets in this snapshot.</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-3">
                      {snapshot.trendWeekly.map((w) => (
                        <div key={w.bucket} className="rounded-lg border border-border/50 p-4">
                          <p className="text-xs text-muted-foreground">{weekLabel(w.bucket)}</p>
                          <p className="mt-1 text-xl font-semibold">{fmtInt(w.totalHoursSaved)} hrs</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtInt(w.scorecards)} scorecards · {fmtPct(w.avgProductivityPercent)} ·{" "}
                            {w.avgConfidence.toFixed(1)} conf
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="regions">
              <Card>
                <CardHeader>
                  <CardTitle>THE REGIONS</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Departments (aggregate dept rows), this rollup period.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {snapshot.regions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No department breakdown available.</p>
                  ) : (
                    <div className="space-y-2">
                      {snapshot.regions.map((r, idx) => (
                        <div
                          key={`${r.department}-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                        >
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
                    Top performers (monthly-equivalent from user-level aggregates), this period.
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {snapshot.leaderboard.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No leaderboard data yet.</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {snapshot.leaderboard.map((p, i) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                        >
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

export default function ExecutiveReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ExecutiveReportInner />
    </Suspense>
  )
}
