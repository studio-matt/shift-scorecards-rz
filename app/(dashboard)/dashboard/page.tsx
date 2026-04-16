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
import {
  PersonalBestsCard,
  StreakAtRiskCard,
  type PersonalBest,
  type DepartmentRanking,
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
  DeptOverTimeChart,
  FieldReportCard,
  AlertsCard,
} from "@/components/dashboard/analytics-sections"
import {
  PersonalTrendChart,
  ProductivityHero,
  type ProductivityHeroData,
} from "@/components/dashboard/user-analytics"
import { getOrganizations, getDocument, getDocuments, getUsersByOrg, COLLECTIONS } from "@/lib/firestore"
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
  computeDeptOverTime,
  computeFieldReport,
  computeAlerts,
  computePersonalStreak,
  computePersonalTrend,
  computePersonalBenchmark,
  findTimeSavingQuestionIds,
  findTimeSavingMinutesQuestionIds,
  findConfidenceQuestionIds,
  computeUserHoursMetrics,
  computeOrgHoursMetrics,
  computeWeeklyHoursTrend,
  type AdminStats,
  type MostImprovedEntry,
  type RecentScorecard,
  type UserStreak,
  type NonResponder,
  type DeptOverTime,
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
  const [timePeriod, setTimePeriod] = useState("this-month") // Default to monthly since scorecards are monthly

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
  const [deptOverTime, setDeptOverTime] = useState<DeptOverTime[]>([])
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
  const [userGoals, setUserGoals] = useState<GoalEntry[]>([])
  const [orgUserDepartments, setOrgUserDepartments] = useState<string[]>([]) // Departments from users in selected org

  // Handle marking a goal as complete
  const handleMarkGoalComplete = useCallback((goalId: string) => {
    setUserGoals(prev => prev.map(g => 
      g.id === goalId ? { ...g, status: "completed" as const, completedAt: new Date().toISOString() } : g
    ))
    // TODO: Persist to database
  }, [])

  // Handle cycling goal status (not-started -> in-progress -> completed -> not-started)
  const handleCycleGoalStatus = useCallback((goalId: string, newStatus: "completed" | "in-progress" | "not-started") => {
    setUserGoals(prev => prev.map(g => 
      g.id === goalId ? { 
        ...g, 
        status: newStatus, 
        completedAt: newStatus === "completed" ? new Date().toISOString() : undefined 
      } : g
    ))
    // TODO: Persist to database
  }, [])

  // Helper to filter responses by time period
  const filterByTimePeriod = useCallback((responses: Awaited<ReturnType<typeof fetchAllResponses>>, period: string) => {
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case "this-month": {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      }
      case "last-30": {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      }
      case "this-quarter": {
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1)
        break
      }
      case "last-quarter": {
        const quarter = Math.floor(now.getMonth() / 3)
        const lastQuarterStart = quarter === 0 
          ? new Date(now.getFullYear() - 1, 9, 1)  // Q4 of last year
          : new Date(now.getFullYear(), (quarter - 1) * 3, 1)
        const lastQuarterEnd = quarter === 0
          ? new Date(now.getFullYear(), 0, 1)
          : new Date(now.getFullYear(), quarter * 3, 1)
        return responses.filter((r) => {
          const date = new Date(r.completedAt)
          return date >= lastQuarterStart && date < lastQuarterEnd
        })
      }
      case "ytd": {
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      }
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1) // Default to this month
    }
    
    return responses.filter((r) => new Date(r.completedAt) >= startDate)
  }, [])

  const loadData = useCallback(async () => {
    // Don't load data until selectedOrg is properly set for non-super-admin users
    // This prevents showing data from all orgs before the user's org is determined
    if (!isSuperAdmin && selectedOrg === "all" && (user?.organizationId || user?.company)) {
      return // Wait for useEffect to set the correct org
    }
    
    try {
      setLoading(true)
      const [orgDocs, allResponses, targetsDoc] = await Promise.all([
        getOrganizations(),
        fetchAllResponses(selectedOrg, selectedDept),
        getDocument(COLLECTIONS.SETTINGS, "dashboardTargets"),
      ])
      
      // Filter responses by selected time period
      const responses = filterByTimePeriod(allResponses, timePeriod)
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
      setOrgs(orgDocs as unknown as Organization[])

      // Compute department performance from ALL responses (unfiltered by time) for dropdown population
      // But use time-filtered responses for the actual metrics display
      const deptFromAll = computeDepartmentPerformance(allResponses)
      
      // Compute all aggregations in parallel using time-filtered responses
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
      // Use department data from ALL responses for dropdown, but chart shows filtered data
      setDeptPerformance(responses.length > 0 ? dept : deptFromAll)
      setTopPerformers(performers)
      setMostImproved(improved)
      setQuestionResults(questions)
      setRecentScorecards(recent)

      // New analytics - pass selectedOrg to computeNonResponders for proper org filtering
      const [streakData, nonResp, dot, report] =
        await Promise.all([
          computeStreaks(responses),
          computeNonResponders(responses, selectedOrg),
          Promise.resolve(computeDeptOverTime(responses)),
          computeFieldReport(responses),
        ])
      setStreaks(streakData)
      setNonResponders(nonResp)
      setDeptOverTime(dot)
      setFieldReport(report)
      setAlerts(computeAlerts(responses, dept, []))
      
      // Compute real field average from all responses
      if (responses.length > 0) {
        let totalScore = 0
        let totalCount = 0
        for (const r of responses) {
          for (const v of Object.values(r.answers)) {
            if (typeof v === "number" && v >= 1 && v <= 10) {
              totalScore += v
              totalCount++
            }
          }
        }
        if (totalCount > 0) {
          const realFieldAvg = Math.round((totalScore / totalCount) * 10) / 10
          setTargets((prev) => ({ ...prev, fieldAverage: realFieldAvg }))
        }
      }

      // Compute hours metrics for admin view (all responses or filtered by org)
      const [timeSavingIds, minutesSavingIds, confidenceIds] = await Promise.all([
        findTimeSavingQuestionIds(),
        findTimeSavingMinutesQuestionIds(),
        findConfidenceQuestionIds(),
      ])
      
      // For admin: compute org hours based on current filter
      const selectedOrgDoc = orgDocs.find((o) => o.id === selectedOrg) as unknown as Organization | undefined
      const adminHourlyRate = selectedOrgDoc?.hourlyRate ?? 100
      const adminOrgHours = computeOrgHoursMetrics(responses, timeSavingIds, confidenceIds, adminHourlyRate, minutesSavingIds)
      setOrgHoursMetrics(adminOrgHours)
      
      // Compute weekly hours trend for chart
      const hoursTrend = computeWeeklyHoursTrend(responses, timeSavingIds)
      setWeeklyHoursTrend(hoursTrend)

      // User-specific metrics - fetch ALL responses (unfiltered) for user's personal data
      // This ensures the user sees their own data regardless of admin filters
      if (user?.id) {
        const allResponses = await fetchAllResponses("all", "all")
        setPersonalStreak(computePersonalStreak(allResponses, user.id))
        setPersonalTrend(computePersonalTrend(allResponses, user.id))
        setPersonalBenchmark(computePersonalBenchmark(allResponses, user.id))
        
        // Compute user-specific hours metrics (use allResponses for user's data)
        const userHours = computeUserHoursMetrics(allResponses, user.id, timeSavingIds, confidenceIds)
        setUserHoursMetrics(userHours)

        // Extract goals from user's responses based on question types
        // We need to fetch templates to get question types
        const templates = await getDocuments(COLLECTIONS.TEMPLATES)
        const templateMap = new Map<string, { questions: Array<{ id: string; type: string }> }>()
        for (const t of templates) {
          const template = t as unknown as { id: string; questions: Array<{ id: string; type: string }> }
          templateMap.set(template.id, template)
        }
        
        const userResponses = allResponses.filter(r => r.userId === user.id)
        const extractedGoals: GoalEntry[] = []
        
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
            }
          }
        }
        
        // Sort by weekOf descending (most recent first)
        extractedGoals.sort((a, b) => b.weekOf.localeCompare(a.weekOf))
        
        setUserGoals(extractedGoals.slice(0, 10)) // Show last 10 goals
      }
      
      // Fetch departments from users in the selected organization
      if (selectedOrg && selectedOrg !== "all") {
        const orgUsers = await getUsersByOrg(selectedOrg)
        const userDepts = new Set<string>()
        for (const u of orgUsers) {
          const userData = u as Record<string, unknown>
          if (userData.department && typeof userData.department === "string") {
            userDepts.add(userData.department)
          }
        }
        setOrgUserDepartments(Array.from(userDepts).sort())
      } else {
        setOrgUserDepartments([])
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedOrg, selectedDept, user, timePeriod, filterByTimePeriod, isSuperAdmin])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Lock org selection for non-super-admin users (company admins and regular users)
  // This ensures they only see data from their own organization
  useEffect(() => {
    if (!isSuperAdmin && selectedOrg === "all") {
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
  }, [isSuperAdmin, user?.organizationId, user?.company, selectedOrg, orgs])

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
  
  // Get departments from multiple sources:
  // 1. Org config (departments array)
  // 2. Users in the selected org (department field)
  // 3. Department performance data (from responses)
  const departments = useMemo(() => {
    const allDepts = new Set<string>()
    
    // Add departments from org config
    if (selectedOrg === "all") {
      orgs.forEach((org) =>
        (org.departments || []).forEach((d: string) => allDepts.add(d)),
      )
    } else if (activeOrg?.departments) {
      (activeOrg.departments as string[]).forEach((d: string) => allDepts.add(d))
    }
    
    // Add departments from users in the selected org (most reliable source)
    orgUserDepartments.forEach((d) => {
      if (d && d.trim()) allDepts.add(d)
    })
    
    // Also add departments from the performance data (these come from actual user responses)
    if (Array.isArray(deptPerformance)) {
      deptPerformance.forEach((dp) => {
        if (dp?.department && dp.department !== "Unknown") {
          allDepts.add(dp.department)
        }
      })
    }
    
    return Array.from(allDepts).sort()
  }, [selectedOrg, activeOrg, orgs, deptPerformance, orgUserDepartments])

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

  // Scorecards are monthly, so weekly options don't make sense
  const timePeriodLabel: Record<string, string> = {
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
                {departments.filter(Boolean).map((dept) => (
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
          {adminStats && <AdminStatCards data={adminStats} targets={targets} hoursMetrics={orgHoursMetrics} hourlyRate={activeOrg?.hourlyRate ?? 100} />}

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

          {/* ── Organizational Intelligence ────────────── */}
          <div className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold text-foreground">Organizational Intelligence</h2>
            <p className="mb-4 text-sm text-muted-foreground">Cross-department comparisons over time</p>
            <DeptOverTimeChart data={deptOverTime} />
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

          {/* ── Champions ─────────────────────────────── */}
          <div className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold text-foreground">Champions</h2>
            <p className="mb-4 text-sm text-muted-foreground">Top performers, most improved, and peer recognition</p>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TopPerformers showCompany data={topPerformers} />
              <div className="flex flex-col gap-6">
                <MostImprovedCard showCompany data={mostImproved} />
                <HighFiveSection performers={topPerformers} currentUserName={user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Admin"} currentUserId={user?.id} organizationId={selectedOrg !== "all" ? selectedOrg : undefined} />
              </div>
            </div>
          </div>

          <QuestionResults data={questionResults} />
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
        {totalResponses > 0 ? (
          productivityHeroData ? (
            <ProductivityHero data={productivityHeroData} />
          ) : (
            <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-card/80 backdrop-blur-sm">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <CardContent className="relative p-6 md:p-8 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-primary mb-4" />
                <h2 className="text-xl font-bold text-foreground">Welcome Back!</h2>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  You&apos;ve completed {totalResponses} scorecard{totalResponses > 1 ? "s" : ""}. Keep the momentum going!
                </p>
                <Button className="mt-4" asChild>
                  <a href="/scorecard">Take Another Scorecard</a>
                </Button>
              </CardContent>
            </Card>
          )
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

        {/* ── Personal Bests ─────── */}
        <div className="border-t border-border/50 pt-4">
          <h2 className="text-lg font-semibold text-foreground">Your Performance</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Track your progress and achievements
          </p>
          <PersonalBestsCard bests={personalBests} />
        </div>

        {/* ── Your Hours Trend ────────────────────────────────── */}
        <div className="border-t border-border/50 pt-4">
          <h2 className="text-lg font-semibold text-foreground">Your Hours Trend</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Hours saved over time through AI adoption
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

        {/* ── Goals from Scorecards ─────────── */}
        <GoalsCard 
          goals={userGoals} 
          onMarkComplete={handleMarkGoalComplete} 
          onCycleStatus={handleCycleGoalStatus}
        />

        {/* ── Champions & Recognition ────────────────── */}
        <div className="border-t border-border/50 pt-4">
          <h2 className="text-lg font-semibold text-foreground">Champions & Recognition</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Top performers and peer recognition (names shown by opt-in only)
          </p>

          {/* Top 5 Performers with Wins + High Fives */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {topPerformers.length > 0 && <MVPSpotlight performer={topPerformers[0]} topPerformers={topPerformers} />}
            <HighFiveSection performers={topPerformers} currentUserName={myName || "User"} currentUserId={user?.id} organizationId={user?.organizationId} />
          </div>
        </div>

        <QuestionResults data={questionResults} />

        {/* Filter to show only current user's scorecards */}
        {(() => {
          const filtered = recentScorecards.filter((sc) => sc.userId === user?.id)
          console.log("[v0] userId:", user?.id)
          console.log("[v0] totalScorecards:", recentScorecards.length)
          console.log("[v0] filteredCount:", filtered.length)
          console.log("[v0] allUserIds:", JSON.stringify(recentScorecards.map(sc => sc.userId)))
          return <RecentScorecardsCard data={filtered} />
        })()}
      </div>
    </div>
  )
}
