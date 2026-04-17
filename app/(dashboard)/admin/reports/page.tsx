"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  Download,
  Mail,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Trophy,
  AlertTriangle,
  Building2,
  Loader2,
  CheckCircle,
  Flame,
} from "lucide-react"
import { getDocuments, COLLECTIONS } from "@/lib/firestore"
import {
  fetchAllResponses,
  computeOrgHoursMetrics,
  computeUserStreaks,
  computeNonResponders,
  computeTopPerformers,
} from "@/lib/dashboard-data"
import type { Organization } from "@/lib/types"
import type { UserStreak, NonResponder, TopPerformer } from "@/lib/dashboard-data"

interface ReportData {
  weekOf: string
  generatedAt: string
  organization: {
    name: string
    totalUsers: number
    activeParticipants: number
    participationRate: number
  }
  metrics: {
    totalHoursSaved: number
    productivityGain: number
    fteEquivalent: number
    periodValue: number
    avgHoursPerUser: number
  }
  topPerformers: TopPerformer[]
  streaks: UserStreak[]
  nonResponders: NonResponder[]
  weekOverWeek: {
    hoursSavedChange: number
    participationChange: number
  }
}

export default function LeadershipReportsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<string>("all")
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [reportData, setReportData] = useState<ReportData | null>(null)
  
  const isSuperAdmin = user?.role === "admin"

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load organizations
      const orgDocs = await getDocuments(COLLECTIONS.ORGANIZATIONS)
      const orgs = orgDocs.map((d) => ({ ...d } as unknown as Organization))
      setOrganizations(orgs)
      
      // Determine which org to use
      const orgId = isSuperAdmin ? selectedOrg : (user?.organizationId || "all")
      
      // Load responses
      const responses = await fetchAllResponses(orgId, "all", user?.id)
      
      // Load all users
      const userDocs = await getDocuments(COLLECTIONS.USERS)
      const allUsers = userDocs.map((d) => ({ ...d } as unknown as { id: string; firstName: string; lastName: string; department?: string; organizationId?: string }))
      
      // Filter users by org if needed
      const orgUsers = orgId === "all" ? allUsers : allUsers.filter(u => u.organizationId === orgId)
      
      // Get current week
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      const weekOf = weekStart.toISOString().slice(0, 10)
      
      // Compute metrics
      const templates = await getDocuments(COLLECTIONS.TEMPLATES)
      const hoursMetrics = await computeOrgHoursMetrics(responses, templates, 100) // Default hourly rate
      
      // Compute streaks, non-responders, top performers
      const streaks = await computeUserStreaks(responses, allUsers)
      const nonResponders = await computeNonResponders(responses, allUsers, orgs)
      const topPerformers = await computeTopPerformers(responses, allUsers, templates)
      
      // Filter by org if needed
      const orgStreaks = orgId === "all" ? streaks : streaks.filter(s => {
        const u = allUsers.find(usr => usr.id === s.userId)
        return u?.organizationId === orgId
      })
      
      const orgNonResponders = orgId === "all" ? nonResponders : nonResponders.filter(n => {
        const u = allUsers.find(usr => usr.id === n.userId)
        return u?.organizationId === orgId
      })
      
      const orgTopPerformers = orgId === "all" ? topPerformers : topPerformers.filter(t => {
        const u = allUsers.find(usr => usr.id === t.id)
        return u?.organizationId === orgId
      })
      
      // Calculate participation
      const respondedUserIds = new Set(responses.map(r => r.userId))
      const activeParticipants = orgUsers.filter(u => respondedUserIds.has(u.id)).length
      const participationRate = orgUsers.length > 0 ? (activeParticipants / orgUsers.length) * 100 : 0
      
      // Get org name
      const orgName = orgId === "all" ? "All Organizations" : orgs.find(o => o.id === orgId)?.name || "Unknown"
      
      setReportData({
        weekOf,
        generatedAt: new Date().toISOString(),
        organization: {
          name: orgName,
          totalUsers: orgUsers.length,
          activeParticipants,
          participationRate,
        },
        metrics: {
          totalHoursSaved: hoursMetrics.totalHoursSaved,
          productivityGain: hoursMetrics.avgProductivityPercent,
          fteEquivalent: hoursMetrics.fteEquivalent,
          periodValue: hoursMetrics.periodValue,
          avgHoursPerUser: hoursMetrics.avgHoursPerUser,
        },
        topPerformers: orgTopPerformers.slice(0, 10),
        streaks: orgStreaks.slice(0, 10),
        nonResponders: orgNonResponders,
        weekOverWeek: {
          hoursSavedChange: 0, // TODO: Calculate from historical data
          participationChange: 0,
        },
      })
    } catch (err) {
      console.error("Failed to load report data:", err)
    } finally {
      setLoading(false)
    }
  }, [isSuperAdmin, selectedOrg, user?.organizationId, user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleGenerateReport() {
    setGenerating(true)
    await loadData()
    setGenerating(false)
  }

  async function handleSendReport() {
    if (!reportData) return
    setSending(true)
    try {
      const orgId = isSuperAdmin && selectedOrg !== "all" ? selectedOrg : user?.organizationId
      const res = await fetch("/api/reports/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          organizationId: orgId,
          type: "leadership" 
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
        setTimeout(() => setSent(false), 3000)
      } else {
        console.error("Failed to send report:", data.error)
      }
    } catch (err) {
      console.error("Failed to send report:", err)
    } finally {
      setSending(false)
    }
  }

  function handleDownloadCSV() {
    if (!reportData) return
    
    const rows: string[] = []
    rows.push("Weekly Leadership Report")
    rows.push(`Organization,${reportData.organization.name}`)
    rows.push(`Week Of,${reportData.weekOf}`)
    rows.push(`Generated,${new Date(reportData.generatedAt).toLocaleString()}`)
    rows.push("")
    rows.push("Key Metrics")
    rows.push(`Total Hours Saved,${reportData.metrics.totalHoursSaved}`)
    rows.push(`Productivity Gain,${reportData.metrics.productivityGain.toFixed(1)}%`)
    rows.push(`FTE Equivalent,${reportData.metrics.fteEquivalent.toFixed(1)}`)
    rows.push(`Period Value,$${reportData.metrics.periodValue.toLocaleString()}`)
    rows.push(`Participation Rate,${reportData.organization.participationRate.toFixed(0)}%`)
    rows.push("")
    rows.push("Top Performers")
    rows.push("Rank,Name,Hours Saved,Responses")
    reportData.topPerformers.forEach((p, i) => {
      rows.push(`${i + 1},${p.name},${p.hoursSaved},${p.responseCount}`)
    })
    rows.push("")
    rows.push("Non-Responders")
    rows.push("Name,Department,Missed Weeks,Last Response")
    reportData.nonResponders.forEach(n => {
      rows.push(`${n.name},${n.department},${n.missedWeeks},${n.lastResponseWeek}`)
    })
    
    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leadership_report_${reportData.weekOf}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Leadership Report</h1>
          <p className="mt-1 text-muted-foreground">
            Organization performance summary and engagement metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="w-48">
                <Building2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={handleGenerateReport} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {reportData && (
        <>
          {/* Report Header Card */}
          <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Week of {new Date(reportData.weekOf).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                  <h2 className="mt-1 text-xl font-semibold">{reportData.organization.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Generated {new Date(reportData.generatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button size="sm" onClick={handleSendReport} disabled={sending || sent}>
                    {sent ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Sent!
                      </>
                    ) : sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Email Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">Hours Saved</span>
                </div>
                <p className="mt-1 text-2xl font-bold">{reportData.metrics.totalHoursSaved.toFixed(0)}</p>
                {reportData.weekOverWeek.hoursSavedChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${reportData.weekOverWeek.hoursSavedChange > 0 ? "text-green-600" : "text-red-600"}`}>
                    {reportData.weekOverWeek.hoursSavedChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(reportData.weekOverWeek.hoursSavedChange).toFixed(0)}% vs last week
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Productivity</span>
                </div>
                <p className="mt-1 text-2xl font-bold">{reportData.metrics.productivityGain.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{reportData.metrics.fteEquivalent.toFixed(1)} FTE equivalent</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs font-medium">$</span>
                  <span className="text-xs font-medium">Value Created</span>
                </div>
                <p className="mt-1 text-2xl font-bold">${reportData.metrics.periodValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">@ $100/hr</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium">Participation</span>
                </div>
                <p className="mt-1 text-2xl font-bold">{reportData.organization.participationRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">
                  {reportData.organization.activeParticipants} of {reportData.organization.totalUsers} users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">Avg/User</span>
                </div>
                <p className="mt-1 text-2xl font-bold">{reportData.metrics.avgHoursPerUser.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">hours saved/week</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers & Non-Responders */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Performers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.topPerformers.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {reportData.topPerformers.slice(0, 5).map((p, i) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30" :
                            i === 1 ? "bg-gray-100 text-gray-600 dark:bg-gray-800" :
                            i === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.department}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{p.hoursSaved.toFixed(1)} hrs</p>
                          <p className="text-xs text-muted-foreground">{p.responseCount} responses</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Engagement Alerts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Engagement Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Non-Responders Summary */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium">Non-Responders</p>
                      <Badge variant={reportData.nonResponders.length > 5 ? "destructive" : "secondary"}>
                        {reportData.nonResponders.length}
                      </Badge>
                    </div>
                    {reportData.nonResponders.length === 0 ? (
                      <p className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/20 dark:text-green-400">
                        Everyone responded this period!
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {reportData.nonResponders.slice(0, 4).map(n => (
                          <div key={n.userId} className="flex items-center justify-between rounded-md border border-border p-2">
                            <div>
                              <p className="text-sm font-medium">{n.name}</p>
                              <p className="text-xs text-muted-foreground">{n.department}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {n.missedWeeks} missed
                            </Badge>
                          </div>
                        ))}
                        {reportData.nonResponders.length > 4 && (
                          <p className="pt-1 text-center text-xs text-muted-foreground">
                            +{reportData.nonResponders.length - 4} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Top Streaks */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Flame className="h-4 w-4 text-orange-500" />
                        Top Streaks
                      </p>
                    </div>
                    {reportData.streaks.length === 0 ? (
                      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                        No active streaks yet
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {reportData.streaks.slice(0, 3).map(s => (
                          <div key={s.userId} className="flex items-center justify-between rounded-md border border-border p-2">
                            <div className="flex items-center gap-2">
                              <Flame className="h-4 w-4 text-orange-400" />
                              <p className="text-sm font-medium">{s.name}</p>
                            </div>
                            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30">
                              {s.currentStreak}w streak
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
