"use client"

// Main dashboard page with analytics, performance metrics, and branding support
import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { useBackground } from "@/lib/background-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { EpicMeaningSection } from "@/components/epic-meaning"
import {
  SkillTierCard,
  PersonalBestsCard,
  DepartmentRivalryCard,
  CohortNudgeCard,
  StreakAtRiskCard,
  WinOfTheMonthCard,
  type PersonalBest,
  type DepartmentRanking,
  type WinEntry,
} from "@/components/dashboard/gamification"
import { StatCards, AdminStatCards } from "@/components/dashboard/stat-cards"
import { TopPerformers, MVPSpotlight, HighFiveSection } from "@/components/dashboard/top-performers"
import { DepartmentPerformanceChart } from "@/components/dashboard/department-performance"
import { WeeklyTrendChart, HoursTrendChart } from "@/components/dashboard/weekly-trend"
import { QuestionResults } from "@/components/dashboard/question-results"
import {
  GoalsCard,
  MostImprovedCard,
  RecentScorecardsCard,
  type GoalEntry,
} from "@/components/dashboard/goals-and-recent"
import {
  StreaksCard,
  NonRespondersCard,
  ScoreVelocityCard,
  DepartmentVarianceCard,
  QuestionCorrelationsCard,
  DeptOverTimeChart,
  OrgBenchmarkCard,
  FieldReportCard,
  AlertsCard,
} from "@/components/dashboard/analytics-sections"
import {
  PersonalStreakCard,
  PersonalBenchmarkCard,
  PersonalTrendChart,
  HoursSavedCard,
  HighFivesReceivedCard,
  ProductivityHero,
  type ProductivityHeroData,
  PercentileDistribution,
  PromptPacksCard,
} from "@/components/dashboard/user-analytics"
import { getOrganizations, getDocument, getDocuments, COLLECTIONS } from "@/lib/firestore"
import { getPromptSettings } from "@/lib/prompt-settings"
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
  computeFieldReport,
  computeAlerts,
  computePersonalStreak,
  computePersonalTrend,
  computePersonalBenchmark,
  findTimeSavingQuestionIds,
  findConfidenceQuestionId,
  computeUserHoursMetrics,
  computeOrgHoursMetrics,
  computeWeeklyHoursTrend,
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
  type FieldReportData,
  type ThresholdAlert,
  type UserPersonalStreak,
  type PersonalTrendPoint,
  type PersonalVsBenchmark,
  type UserHoursMetrics,
  type OrgHoursMetrics,
  type WeeklyHoursTrend,
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
  const { isAdmin, isSuperAdmin, isCompanyAdmin, user } = useAuth()
  const { setSelectedOrgColor, setSelectedOrgButtonColor, setSelectedOrgButtonFontColor, setSelectedOrgAccentColor } = useBackground()

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
  const [fieldReport, setFieldReport] = useState<FieldReportData | null>(null)
  const [alerts, setAlerts] = useState<ThresholdAlert[]>([])
  const [personalStreak, setPersonalStreak] = useState<UserPersonalStreak | null>(null)
  const [personalTrend, setPersonalTrend] = useState<PersonalTrendPoint[]>([])
  const [personalBenchmark, setPersonalBenchmark] = useState<PersonalVsBenchmark | null>(null)
  const [userHoursMetrics, setUserHoursMetrics] = useState<UserHoursMetrics | null>(null)
  const [orgHoursMetrics, setOrgHoursMetrics] = useState<OrgHoursMetrics | null>(null)
  const [weeklyHoursTrend, setWeeklyHoursTrend] = useState<WeeklyHoursTrend[]>([])
  const [targets, setTargets] = useState({
    avgScore: 7.0,
    completionRate: 85,
    activeUsers: 100,
    scorecardsSent: 50,
    fieldAverage: 6.2,
  })
  const [varianceFeedback, setVarianceFeedback] = useState<Record<string, unknown> | undefined>(undefined)
  const [userGoals, setUserGoals] = useState<GoalEntry[]>([])
  const [userWins, setUserWins] = useState<WinEntry[]>([])

  // Handle marking a goal as complete
  const handleMarkGoalComplete = useCallback((goalId: string) => {
    setUserGoals(prev => prev.map(g => 
      g.id === goalId ? { ...g, status: "completed" as const, completedAt: new Date().toISOString() } : g
    ))
    // TODO: Persist to database
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [orgDocs, responses, targetsDoc, feedbackDoc, promptSettings] = await Promise.all([
        getOrganizations(),
        fetchAllResponses(selectedOrg, selectedDept),
        getDocument(COLLECTIONS.SETTINGS, "dashboardTargets"),
        getDocument(COLLECTIONS.SETTINGS, "analyticsFeedback"),
        user?.organizationId ? getPromptSettings(user.organizationId) : Promise.resolve(null),
      ])
      if (targetsDoc) {
        const t = targetsDoc as Record<string, unknown>
        setTargets((prev) => ({
          avgScore: (t.avgScore as number) ?? prev.avgScore,
          completionRate: (t.completionRate as number) ?? prev.completionRate,
          activeUsers: (t.activeUsers as number) ?? prev.activeUsers,
          scorecardsSent: (t.scorecardsSent as number) ?? prev.scorecardsSent,
          fieldAverage: (t.fieldAverage as number) ?? prev.fieldAverage,
        }))
      }
      if (feedbackDoc) {
        const f = feedbackDoc as Record<string, unknown>
        if (f.varianceFeedback) setVarianceFeedback(f.varianceFeedback as Record<string, unknown>)
      }
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
      const [streakData, nonResp, vel, variance, corr, dot, benchmarks, report] =
        await Promise.all([
          computeStreaks(responses),
          computeNonResponders(responses),
          computeScoreVelocity(responses),
          Promise.resolve(computeDepartmentVariance(responses)),
          computeQuestionCorrelations(responses),
          Promise.resolve(computeDeptOverTime(responses)),
          computeOrgBenchmarks(responses),
          computeFieldReport(responses),
        ])
      setStreaks(streakData)
      setNonResponders(nonResp)
      setVelocities(vel)
      setDeptVariance(variance)
      setCorrelations(corr)
      setDeptOverTime(dot)
      setOrgBenchmarks(benchmarks)
      setFieldReport(report)
      setAlerts(computeAlerts(responses, dept, vel))

      // Compute hours metrics for admin view (all responses or filtered by org)
      const [timeSavingIds, confidenceId] = await Promise.all([
        findTimeSavingQuestionIds(),
        findConfidenceQuestionId(),
      ])
      
      // For admin: compute org hours based on current filter
      const selectedOrgDoc = orgDocs.find((o) => o.id === selectedOrg) as unknown as Organization | undefined
      const adminHourlyRate = selectedOrgDoc?.hourlyRate ?? 100
      const adminOrgHours = computeOrgHoursMetrics(responses, timeSavingIds, confidenceId, adminHourlyRate)
      setOrgHoursMetrics(adminOrgHours)
      
      // Compute weekly hours trend for chart
      const hoursTrend = computeWeeklyHoursTrend(responses, timeSavingIds)
      setWeeklyHoursTrend(hoursTrend)

      // User-specific metrics (uses full response set for anonymized comparisons)
      if (user?.id) {
        setPersonalStreak(computePersonalStreak(responses, user.id))
        setPersonalTrend(computePersonalTrend(responses, user.id))
        setPersonalBenchmark(computePersonalBenchmark(responses, user.id))
        
        // Compute user-specific hours metrics (reuse timeSavingIds/confidenceId from above)
        const userHours = computeUserHoursMetrics(responses, user.id, timeSavingIds, confidenceId)
        setUserHoursMetrics(userHours)

        // Extract goals and wins from user's responses based on question types
        // We need to fetch templates to get question types
        const templates = await getDocuments(COLLECTIONS.TEMPLATES)
        const templateMap = new Map<string, { questions: Array<{ id: string; type: string }> }>()
        for (const t of templates) {
          const template = t as unknown as { id: string; questions: Array<{ id: string; type: string }> }
          templateMap.set(template.id, template)
        }
        
        const userResponses = responses.filter(r => r.userId === user.id)
        const extractedGoals: GoalEntry[] = []
        const extractedWins: WinEntry[] = []
        
        for (const response of userResponses) {
          const responseId = (response as unknown as { id: string }).id || `${response.userId}-${response.completedAt}`
          const template = templateMap.get(response.templateId)
          if (!template?.questions) continue
          
          for (const question of template.questions) {
            const answer = response.answers?.[question.id]
            if (!answer || typeof answer !== "string" || !answer.trim()) continue
            
            if (question.type === "goals") {
              extractedGoals.push({
                id: `${responseId}-${question.id}`,
                text: answer,
                weekOf: response.weekOf || response.completedAt?.slice(0, 10) || "",
                status: "in-progress",
              })
            } else if (question.type === "win") {
              extractedWins.push({
                id: `${responseId}-${question.id}`,
                text: answer,
                weekOf: response.weekOf || response.completedAt?.slice(0, 10) || "",
              })
            }
          }
        }
        
        // Sort by weekOf descending (most recent first)
        extractedGoals.sort((a, b) => b.weekOf.localeCompare(a.weekOf))
        extractedWins.sort((a, b) => b.weekOf.localeCompare(a.weekOf))
        
        setUserGoals(extractedGoals.slice(0, 10)) // Show last 10 goals
        setUserWins(extractedWins.slice(0, 5)) // Show last 5 wins
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

  // Lock org selection for company admins once user data is available
  useEffect(() => {
    if (isCompanyAdmin && selectedOrg === "all") {
      // Try organizationId first, then fall back to finding org by company name
      if (user?.organizationId) {
        setSelectedOrg(user.organizationId)
      } else if (user?.company && orgs.length > 0) {
        const matchedOrg = orgs.find(o => o.name.toLowerCase() === user.company?.toLowerCase())
        if (matchedOrg) {
          setSelectedOrg(matchedOrg.id)
        }
      }
    }
  }, [isCompanyAdmin, user?.organizationId, user?.company, selectedOrg, orgs])

  const activeOrg = orgs.find((o) => o.id === selectedOrg)

  // Update branding colors when super admin switches companies
  useEffect(() => {
    if (isSuperAdmin && selectedOrg !== "all") {
      setSelectedOrgColor(activeOrg?.backgroundColor ?? null)
      setSelectedOrgButtonColor(activeOrg?.buttonColor ?? null)
      setSelectedOrgButtonFontColor(activeOrg?.buttonFontColor ?? null)
      setSelectedOrgAccentColor(activeOrg?.accentColor ?? null)
    } else if (isSuperAdmin && selectedOrg === "all") {
      setSelectedOrgColor(null) // Reset to user's org or default
      setSelectedOrgButtonColor(null)
      setSelectedOrgButtonFontColor(null)
      setSelectedOrgAccentColor(null)
    }
    // Cleanup when leaving dashboard
    return () => {
      if (isSuperAdmin) {
        setSelectedOrgColor(null)
        setSelectedOrgButtonColor(null)
        setSelectedOrgButtonFontColor(null)
        setSelectedOrgAccentColor(null)
      }
    }
  }, [isSuperAdmin, activeOrg?.backgroundColor, activeOrg?.buttonColor, activeOrg?.buttonFontColor, activeOrg?.accentColor, selectedOrg, setSelectedOrgColor, setSelectedOrgButtonColor, setSelectedOrgButtonFontColor, setSelectedOrgAccentColor])
  
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
      parts.push("All Companies")
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
    // For company admins, use their locked organization name (try multiple sources)
    const companyAdminOrgName = isCompanyAdmin 
      ? activeOrg?.name ?? orgs.find(o => o.name.toLowerCase() === user?.company?.toLowerCase())?.name ?? user?.company ?? "Your Organization"
      : null

    return (
      <div>
        {/* Admin header with filters */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isCompanyAdmin ? "CEO View: Dashboard" : "Admin Dashboard"}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {isCompanyAdmin 
                  ? `Performance metrics and analytics for ${companyAdminOrgName}`
                  : "Global performance metrics and analytics across all companies"}
              </p>
            </div>
          </div>

          {/* Filter bar */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
            {/* Company admin sees locked org, super admin can select */}
            {isCompanyAdmin ? (
              <div className="flex h-10 w-48 items-center rounded-md border border-input bg-muted px-3 text-sm">
                {companyAdminOrgName}
              </div>
            ) : (
              <Select
                value={selectedOrg}
                onValueChange={(val) => {
                  setSelectedOrg(val)
                  setSelectedDept("all")
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {orgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={selectedDept}
              onValueChange={setSelectedDept}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Departments" />
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
          {adminStats && <AdminStatCards data={adminStats} targets={targets} hoursMetrics={orgHoursMetrics} />}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <HoursTrendChart data={weeklyHoursTrend} />
            <DepartmentPerformanceChart data={deptPerformance} fieldAverage={targets.fieldAverage} />
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

          {/* ── Hours Saved Trends ─────────────────────── */}
          <div className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold text-foreground">Hours Saved Trends</h2>
            <p className="mb-4 text-sm text-muted-foreground">Hours saved velocity, variance, and question correlations</p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ScoreVelocityCard data={velocities} />
              <DepartmentVarianceCard data={deptVariance} feedbackSettings={varianceFeedback as Record<string, unknown> | undefined} />
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
<div className="mt-4">
<FieldReportCard data={fieldReport} />
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

          {/* ── Champions ───────────────────────────�����─── */}
          <div className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold text-foreground">Champions</h2>
            <p className="mb-4 text-sm text-muted-foreground">Top performers, most improved, and peer recognition</p>

            {/* MVP Spotlight - Top 5 */}
            {topPerformers.length > 0 && (
              <div className="mb-6">
                <MVPSpotlight performer={topPerformers[0]} topPerformers={topPerformers} />
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TopPerformers showCompany data={topPerformers} />
              <div className="flex flex-col gap-6">
                <MostImprovedCard showCompany data={mostImproved} />
                <HighFiveSection performers={topPerformers} currentUserName={user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Admin"} />
              </div>
            </div>
          </div>

          <QuestionResults data={questionResults} />

          <RecentScorecardsCard data={recentScorecards} />
        </div>
      </div>
    )
  }

  // --- User Dashboard ---

  // Derive weak categories for AI Action Plan & Prompt Packs
  const weakCategories = questionResults
    .filter((q) => typeof q.score === "number" && q.score < 7)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((q) => ({
      category: q.question,
      score: Math.round(q.score * 10) / 10,
      suggestion: q.score < 5
        ? "This is a critical gap. Focus daily practice here for the biggest AI productivity gains."
        : q.score < 6
        ? "Solid room for improvement. Dedicate 15 minutes this week to AI-assisted workflows in this area."
        : "Close to proficient. A few targeted prompts could push you past the threshold.",
    }))

  // High fives received count
  const myName = user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : ""
  // TopPerformer doesn't have highFives field yet, default to mock count based on streak
  const myPerformer = topPerformers.find(
    (p) => p.name.toLowerCase() === myName.toLowerCase(),
  )
  const highFiveCount = myPerformer ? Math.min(myPerformer.streak, 8) : 0

  // Use org's hourly rate if available, otherwise default to $100/hr
  const userOrg = orgs.find((o) => o.id === user?.organizationId)
  const effectiveHourlyRate = activeOrg?.hourlyRate ?? (userOrg as Organization | undefined)?.hourlyRate ?? 100
  
  // Build ProductivityHero data from hours metrics
  const totalResponses = personalStreak?.totalResponses ?? 0
  const productivityHeroData: ProductivityHeroData | null = userHoursMetrics ? {
    productivityPercent: userHoursMetrics.productivityPercent,
    lastMonthProductivity: userHoursMetrics.lastMonthHours > 0 
      ? ((userHoursMetrics.lastMonthHours / 4) / 40) * 100  // Weekly avg from last month
      : 0,
    monthlyHours: userHoursMetrics.thisMonthHours,
    lastMonthHours: userHoursMetrics.lastMonthHours,
    monthlyValue: Math.round(userHoursMetrics.thisMonthHours * effectiveHourlyRate),
    lastMonthValue: Math.round(userHoursMetrics.lastMonthHours * effectiveHourlyRate),
    hourlyRate: effectiveHourlyRate,
    fteEquivalent: userHoursMetrics.thisMonthHours / 160,
    annualRunRate: userHoursMetrics.thisMonthHours * 12,
    annualValue: Math.round(userHoursMetrics.thisMonthHours * effectiveHourlyRate * 12),
    confidenceScore: userHoursMetrics.confidenceScore,
    lastMonthConfidence: userHoursMetrics.lastMonthConfidence,
    thisMonthResponses: userHoursMetrics.thisMonthResponses,
    lastMonthResponses: userHoursMetrics.lastMonthResponses,
  } : null

  // Calculate months active for tier system
  const monthsActive = Math.ceil((personalStreak?.totalWeeks ?? 0) / 4)

  // Mock personal bests (in real app, calculate from response history)
  const personalBests: PersonalBest[] = weakCategories.length > 0 ? weakCategories.slice(0, 4).map((cat, idx) => ({
    category: cat.category,
    score: Math.min(10, cat.score + 1.5),
    previousBest: cat.score,
    achievedDate: new Date().toISOString(),
    isNew: idx === 0, // First one is "new" for demo
  })) : []

  // Mock department rankings (in real app, compute from responses grouped by department)
  const departmentRankings: DepartmentRanking[] = [
    { department: "Operations", avgScore: 7.8, rank: 1, change: 1, participationRate: 92 },
    { department: "Marketing", avgScore: 7.5, rank: 2, change: -1, participationRate: 85 },
    { department: "Engineering", avgScore: 7.2, rank: 3, change: 0, participationRate: 78 },
    { department: "Sales", avgScore: 6.9, rank: 4, change: 2, participationRate: 71 },
    { department: "HR", avgScore: 6.5, rank: 5, change: -1, participationRate: 65 },
  ]

  // Calculate days until deadline (assume monthly cadence, 7 days remaining)
  const daysUntilDeadline = 7 // In real app, calculate from release schedule

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Track your AI adoption journey, scorecard progress, and personal performance
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Productivity Hero (Time-Saved Metrics) ──────────────────────── */}
        {productivityHeroData && totalResponses > 0 ? (
          <ProductivityHero data={productivityHeroData} />
        ) : (
          <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-card/80 backdrop-blur-sm">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <CardContent className="relative p-6 md:p-8 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-primary mb-4" />
              <h2 className="text-xl font-bold text-foreground">Your AI Journey Starts Here</h2>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                Complete your first scorecard to unlock personalized insights, action plans, and track your hours saved.
              </p>
              <Button className="mt-4" asChild>
                <a href="/scorecard">Take Your First Scorecard</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Streak At Risk Warning (if applicable) ───── */}
        <StreakAtRiskCard
          currentStreak={personalStreak?.currentStreak ?? 0}
          daysUntilDeadline={daysUntilDeadline}
        />

        {/* ── Epic Meaning: Why This Matters + Movement Counter ── 
        <EpicMeaningSection
          totalProfessionals={adminStats?.activeUsers ?? 4200}
          totalOrganizations={orgs.length || 47}
        />
        */}

        {/* ── Skill Tier + Cohort Nudge (AI Explorer / Peer Insight) - COMMENTED OUT FOR NOW ──
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkillTierCard
            monthsActive={monthsActive}
            avgScore={userHoursMetrics?.confidenceScore ?? 0}
            totalResponses={totalResponses}
          />
          <CohortNudgeCard
            cohort={user?.organizationId ? "your organization" : "your cohort"}
            hoursSaved={Math.round((orgHoursMetrics?.monthlyHours ?? 0) * 0.7)}
            pointsImproved={Math.abs(userHoursMetrics?.confidenceChange ?? 0)}
            scorecardsCompleted={(orgHoursMetrics?.thisMonthResponses ?? 0) + 15}
          />
        </div>
        */}

        {/* ── Stat Cards (contextual - hours-focused) ───────────────────── */}
        <StatCards
          avgScore={userHoursMetrics?.confidenceScore ?? 0}
          fieldAverage={targets.fieldAverage}
          lastMonthAvg={userHoursMetrics?.lastMonthConfidence ?? 0}
          myGoal={8.0}
          streak={personalStreak?.currentStreak ?? 0}
          maxStreak={personalStreak?.maxStreak ?? 0}
          completedSections={personalStreak?.totalResponses ?? 0}
          totalSections={Math.max(personalStreak?.totalWeeks ?? 1, 1)}
          percentile={personalBenchmark?.percentile ?? 0}
          hoursMetrics={userHoursMetrics}
          hourlyRate={effectiveHourlyRate}
        />

        {/* ── Percentile Ranking + Personal Bests ─────── */}
        <div className="border-t border-border/50 pt-4">
          <h2 className="text-lg font-semibold text-foreground">Your Performance</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Where you stand and how you compare (all comparisons are anonymized)
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PercentileDistribution
              percentile={personalBenchmark?.percentile ?? 50}
              cohortCount={10}
              totalParticipants={850}
            />
            <PersonalBestsCard bests={personalBests} />
          </div>
          
{personalBenchmark && (
  <div className="mt-4">
  <PersonalBenchmarkCard
  data={personalBenchmark}
  fieldAverage={targets.fieldAverage}
  monthlyGoal={8.0}
  thisMonthHours={userHoursMetrics?.totalHoursSaved ?? 0}
  lastMonthHours={(userHoursMetrics?.totalHoursSaved ?? 0) * 0.85} // TODO: Track actual previous month data
  />
  </div>
          )}
        </div>

        {/* ── Your Trend ────────────────────────────────── */}
        <div className="border-t border-border/50 pt-4">
          <h2 className="text-lg font-semibold text-foreground">Your Trend</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Your scores over time compared to field average ({targets.fieldAverage.toFixed(1)})
          </p>
          {personalTrend.length > 0 ? (
            <PersonalTrendChart data={personalTrend} />
          ) : (
            <div className="rounded-lg border border-dashed border-border/50 bg-muted/30 px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Your trend chart will appear after you complete at least one scorecard.
              </p>
            </div>
          )}
        </div>

        {/* ── Goals and Wins from Scorecards ─────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GoalsCard goals={userGoals} onMarkComplete={handleMarkGoalComplete} />
          <WinOfTheMonthCard wins={userWins} />
        </div>

        {/* ── Champions & Recognition ────────────────── */}
        <div className="border-t border-border/50 pt-4">
          <h2 className="text-lg font-semibold text-foreground">Champions & Recognition</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Top performers and peer recognition (names shown by opt-in only)
          </p>

          {/* MVP Spotlight + High Fives - consolidated to single recognition area */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {topPerformers.length > 0 && <MVPSpotlight performer={topPerformers[0]} topPerformers={topPerformers} />}
            <HighFiveSection performers={topPerformers} currentUserName={myName || "User"} />
          </div>

          {/* Leaderboard, MostImproved, HighFivesReceived - COMMENTED OUT to reduce clutter
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
            <HighFivesReceivedCard count={highFiveCount} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopPerformers data={topPerformers} />
            <div className="flex flex-col gap-6">
              <MostImprovedCard data={mostImproved} />
            </div>
          </div>
          */}
        </div>

        <QuestionResults data={questionResults} />

        {/* ── Prompt Packs ────────────────────────────── */}
        <div className="border-t border-border/50 pt-4">
          <h2 className="text-lg font-semibold text-foreground">Prompt Packs</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Ready-to-use AI prompt collections to boost your productivity
          </p>
          <PromptPacksCard />
        </div>

        <RecentScorecardsCard data={recentScorecards} />
      </div>
    </div>
  )
}
