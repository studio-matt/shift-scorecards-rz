"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatCards, AdminStatCards } from "@/components/dashboard/stat-cards"
import { TopPerformers } from "@/components/dashboard/top-performers"
import { DepartmentPerformanceChart } from "@/components/dashboard/department-performance"
import { WeeklyTrendChart } from "@/components/dashboard/weekly-trend"
import { QuestionResults } from "@/components/dashboard/question-results"
import {
  GoalsCard,
  MostImprovedCard,
  RecentScorecardsCard,
} from "@/components/dashboard/goals-and-recent"
import {
  StreaksCard,
  NonRespondersCard,
  ScoreVelocityCard,
  DepartmentVarianceCard,
  QuestionCorrelationsCard,
  DeptOverTimeChart,
  OrgBenchmarkCard,
  AlertsCard,
} from "@/components/dashboard/analytics-sections"
import {
  PersonalStreakCard,
  PersonalBenchmarkCard,
  PersonalTrendChart,
} from "@/components/dashboard/user-analytics"
import { getOrganizations } from "@/lib/firestore"
import {
  fetchAllResponses,
  computeAdminStats,
  computeWeeklyTrend,
  computeDepartmentPerformance,
  computeTopPerformers,
  computeMostImproved,
  computeQuestionResults,
  computeRecentScorecards,
  computeStreaks,
  computeNonResponders,
  computeScoreVelocity,
  computeDepartmentVariance,
  computeQuestionCorrelations,
  computeDeptOverTime,
  computeOrgBenchmarks,
  computeAlerts,
  computePersonalStreak,
  computePersonalTrend,
  computePersonalBenchmark,
  type AdminStats,
  type MostImprovedEntry,
  type RecentScorecard,
  type UserStreak,
  type NonResponder,
  type ScoreVelocity,
  type DepartmentVariance,
  type QuestionCorrelation,
  type DeptOverTime,
  type OrgBenchmark,
  type ThresholdAlert,
  type UserPersonalStreak,
  type PersonalTrendPoint,
  type PersonalVsBenchmark,
} from "@/lib/dashboard-data"
import type {
  Organization,
  WeeklyTrend,
  DepartmentPerformance,
  TopPerformer,
  QuestionResult,
} from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const { isAdmin, user } = useAuth()

  // Admin filter state
  const [selectedOrg, setSelectedOrg] = useState("all")
  const [selectedDept, setSelectedDept] = useState("all")
  const [timePeriod, setTimePeriod] = useState("this-week")

  // Data state
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([])
  const [deptPerformance, setDeptPerformance] = useState<DepartmentPerformance[]>([])
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([])
  const [mostImproved, setMostImproved] = useState<MostImprovedEntry[]>([])
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([])
  const [recentScorecards, setRecentScorecards] = useState<RecentScorecard[]>([])
  const [streaks, setStreaks] = useState<UserStreak[]>([])
  const [nonResponders, setNonResponders] = useState<NonResponder[]>([])
  const [velocities, setVelocities] = useState<ScoreVelocity[]>([])
  const [deptVariance, setDeptVariance] = useState<DepartmentVariance[]>([])
  const [correlations, setCorrelations] = useState<QuestionCorrelation[]>([])
  const [deptOverTime, setDeptOverTime] = useState<DeptOverTime[]>([])
  const [orgBenchmarks, setOrgBenchmarks] = useState<OrgBenchmark[]>([])
  const [alerts, setAlerts] = useState<ThresholdAlert[]>([])
  const [personalStreak, setPersonalStreak] = useState<UserPersonalStreak | null>(null)
  const [personalTrend, setPersonalTrend] = useState<PersonalTrendPoint[]>([])
  const [personalBenchmark, setPersonalBenchmark] = useState<PersonalVsBenchmark | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [orgDocs, responses] = await Promise.all([
        getOrganizations(),
        fetchAllResponses(selectedOrg, selectedDept),
      ])
      setOrgs(orgDocs as unknown as Organization[])

      // Compute all aggregations in parallel
      const [stats, trend, dept, performers, improved, questions, recent] =
        await Promise.all([
          computeAdminStats(responses),
          Promise.resolve(computeWeeklyTrend(responses)),
          Promise.resolve(computeDepartmentPerformance(responses)),
          computeTopPerformers(responses),
          computeMostImproved(responses),
          computeQuestionResults(responses),
          computeRecentScorecards(responses),
        ])

      setAdminStats(stats)
      setWeeklyTrend(trend)
      setDeptPerformance(dept)
      setTopPerformers(performers)
      setMostImproved(improved)
      setQuestionResults(questions)
      setRecentScorecards(recent)

      // New analytics
      const [streakData, nonResp, vel, variance, corr, dot, benchmarks] =
        await Promise.all([
          Promise.resolve(computeStreaks(responses)),
          computeNonResponders(responses),
          Promise.resolve(computeScoreVelocity(responses)),
          Promise.resolve(computeDepartmentVariance(responses)),
          computeQuestionCorrelations(responses),
          Promise.resolve(computeDeptOverTime(responses)),
          computeOrgBenchmarks(responses),
        ])
      setStreaks(streakData)
      setNonResponders(nonResp)
      setVelocities(vel)
      setDeptVariance(variance)
      setCorrelations(corr)
      setDeptOverTime(dot)
      setOrgBenchmarks(benchmarks)
      setAlerts(computeAlerts(responses, dept, vel))

      // User-specific metrics (uses full response set for anonymized comparisons)
      if (user?.id) {
        setPersonalStreak(computePersonalStreak(responses, user.id))
        setPersonalTrend(computePersonalTrend(responses, user.id))
        setPersonalBenchmark(computePersonalBenchmark(responses, user.id))
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedOrg, selectedDept, user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const activeOrg = orgs.find((o) => o.id === selectedOrg)

  const departments = useMemo(() => {
    if (selectedOrg === "all") {
      const allDepts = new Set<string>()
      orgs.forEach((org) =>
        (org.departments || []).forEach((d: string) => allDepts.add(d)),
      )
      return Array.from(allDepts).sort()
    }
    return activeOrg?.departments ?? []
  }, [selectedOrg, activeOrg, orgs])

  const filterLabel = useMemo(() => {
    const parts: string[] = []
    if (selectedOrg === "all") {
      parts.push("All Organizations")
    } else {
      parts.push(activeOrg?.name ?? "")
    }
    if (selectedDept !== "all") {
      parts.push(selectedDept)
    }
    return parts.join(" / ")
  }, [selectedOrg, selectedDept, activeOrg])

  const timePeriodLabel: Record<string, string> = {
    "this-week": "This Week",
    "last-week": "Last Week",
    "this-month": "This Month",
    "last-30": "Last 30 Days",
    "this-quarter": "This Quarter",
    "last-quarter": "Last Quarter",
    "ytd": "Year to Date",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isAdmin) {
    return (
      <div>
        {/* Admin header with filters */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-muted-foreground">
                Global performance metrics and analytics across all organizations
              </p>
            </div>
          </div>

          {/* Filter bar */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
            <Select
              value={selectedOrg}
              onValueChange={(val) => {
                setSelectedOrg(val)
                setSelectedDept("all")
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {orgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedDept}
              onValueChange={setSelectedDept}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-30">Last 30 Days</SelectItem>
                <SelectItem value="this-quarter">This Quarter</SelectItem>
                <SelectItem value="last-quarter">Last Quarter</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant="secondary" className="ml-auto text-xs">
              {filterLabel} &middot; {timePeriodLabel[timePeriod]}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {adminStats && <AdminStatCards data={adminStats} />}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <WeeklyTrendChart data={weeklyTrend} />
            <DepartmentPerformanceChart data={deptPerformance} />
          </div>

          {/* ── Engagement Metrics ────────────────────── */}
          <div className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold text-foreground">Engagement Metrics</h2>
            <p className="mb-4 text-sm text-muted-foreground">Participation streaks and non-responders</p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <StreaksCard data={streaks} />
              <NonRespondersCard data={nonResponders} />
            </div>
          </div>

          {/* ── Trend & Sentiment ─────────────────────── */}
          <div className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold text-foreground">Trend & Sentiment</h2>
            <p className="mb-4 text-sm text-muted-foreground">Score velocity, variance, and question correlations</p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ScoreVelocityCard data={velocities} />
              <DepartmentVarianceCard data={deptVariance} />
            </div>
            <div className="mt-4">
              <QuestionCorrelationsCard data={correlations} />
            </div>
          </div>

          {/* ── Organizational Intelligence ────────────── */}
          <div className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold text-foreground">Organizational Intelligence</h2>
            <p className="mb-4 text-sm text-muted-foreground">Cross-department and cross-org comparisons</p>
            <DeptOverTimeChart data={deptOverTime} />
            <div className="mt-4">
              <OrgBenchmarkCard data={orgBenchmarks} />
            </div>
          </div>

          {/* ── Actionable Alerts ──────────────────────── */}
          {alerts.length > 0 && (
            <div className="border-t border-border pt-4">
              <h2 className="text-lg font-semibold text-foreground">Actionable Alerts</h2>
              <p className="mb-4 text-sm text-muted-foreground">Scores or trends that need attention</p>
              <AlertsCard data={alerts} />
            </div>
          )}

          {/* ── Champions ─────────────────────────────── */}
          <div className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold text-foreground">Champions</h2>
            <p className="mb-4 text-sm text-muted-foreground">Top performers and most improved</p>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TopPerformers showCompany data={topPerformers} />
              <MostImprovedCard showCompany data={mostImproved} />
            </div>
          </div>

          <QuestionResults data={questionResults} />

          <RecentScorecardsCard data={recentScorecards} />
        </div>
      </div>
    )
  }

  // --- User Dashboard ---
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Track your scorecard progress and personal performance metrics
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <StatCards />

        {/* Your Performance */}
        <div className="border-t border-border pt-4">
          <h2 className="text-lg font-semibold text-foreground">Your Performance</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Personal stats and how you compare (all comparisons are anonymized)
          </p>
          {personalStreak || personalBenchmark ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {personalStreak && <PersonalStreakCard data={personalStreak} />}
              {personalBenchmark && <PersonalBenchmarkCard data={personalBenchmark} />}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Complete your first scorecard to see your personal performance metrics here.
              </p>
            </div>
          )}
        </div>

        {/* Your Trend */}
        <div className="border-t border-border pt-4">
          <h2 className="text-lg font-semibold text-foreground">Your Trend</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Your scores over time compared to anonymized averages
          </p>
          {personalTrend.length > 0 ? (
            <PersonalTrendChart data={personalTrend} />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Your trend chart will appear after you complete at least one scorecard.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WeeklyTrendChart data={weeklyTrend} />
          <GoalsCard />
        </div>

        <QuestionResults data={questionResults} />

        <RecentScorecardsCard data={recentScorecards} />
      </div>
    </div>
  )
}
