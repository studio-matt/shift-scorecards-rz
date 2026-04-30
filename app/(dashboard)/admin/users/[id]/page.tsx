"use client"

import { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Clock, TrendingUp, Award, CalendarDays, Loader2 } from "lucide-react"
import {
  getDocument,
  getDocuments,
  getUserResponses,
  getUserResponsesUnordered,
  updateDocument,
  COLLECTIONS,
} from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import { parseTimeValue } from "@/lib/dashboard-data"

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
  department: string
  role: string
  organizationId: string
  organizationName: string
  status: string
  createdAt: string
}

interface ScorecardResponse {
  id: string
  templateId: string
  templateName: string
  weekOf: string
  completedAt: string
  updatedAt?: string
  createdAt?: string
  status: string
  answers: Record<string, string | number>
  totalHours: number
}

interface TemplateQuestion {
  id: string
  text: string
  type?: string
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params)
  const { isSuperAdmin, isCompanyAdmin } = useAuth()
  
  const [userData, setUserData] = useState<UserData | null>(null)
  const [scorecards, setScorecards] = useState<ScorecardResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedScorecard, setSelectedScorecard] = useState<ScorecardResponse | null>(null)
  const [templateQuestions, setTemplateQuestions] = useState<TemplateQuestion[]>([])
  const [timePeriod, setTimePeriod] = useState("all")
  const [showDrafts, setShowDrafts] = useState(true)
  
  // Stats
  const [totalHours, setTotalHours] = useState(0)
  const [avgHoursPerWeek, setAvgHoursPerWeek] = useState(0)
  const [scorecardCount, setScorecardsCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [completingId, setCompletingId] = useState<string | null>(null)
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch user data
      const userDoc = await getDocument(COLLECTIONS.USERS, userId)
      if (!userDoc) {
        setLoading(false)
        return
      }
      
      const uData = userDoc as Record<string, unknown>
      
      // Fetch org name
      let orgName = ""
      if (uData.organizationId) {
        const org = await getDocument(COLLECTIONS.ORGANIZATIONS, uData.organizationId as string)
        if (org) {
          orgName = (org as Record<string, unknown>).name as string || ""
        }
      }
      
      setUserData({
        id: userDoc.id,
        firstName: (uData.firstName as string) || "",
        lastName: (uData.lastName as string) || "",
        email: (uData.email as string) || "",
        department: (uData.department as string) || "",
        role: (uData.role as string) || "user",
        organizationId: (uData.organizationId as string) || "",
        organizationName: orgName,
        status: uData.authId ? "active" : "pending",
        createdAt: (uData.createdAt as string) || "",
      })
      
      // Fetch user's scorecard responses
      const [responseDocs, templateDocs] = await Promise.all([
        // Use unordered so drafts (no completedAt) still appear
        getUserResponsesUnordered(userId),
        getDocuments(COLLECTIONS.TEMPLATES),
      ])
      
      // Build template question map
      const templateQuestionMap = new Map<string, TemplateQuestion[]>()
      for (const tmpl of templateDocs) {
        const data = tmpl as Record<string, unknown>
        const qs = (data.questions as TemplateQuestion[]) || []
        templateQuestionMap.set(tmpl.id, qs)
      }
      
      // Include BOTH completed + drafts (drafts are the autosaves / Save & Exit path)
      const allUserResponses = responseDocs
        .filter((r) => {
          const data = r as Record<string, unknown>
          return data.userId === userId
        })
        .map((r) => {
          const data = r as Record<string, unknown>
          const answers = (data.answers as Record<string, string | number>) || {}
          const templateId = (data.templateId as string) || ""
          const questions = templateQuestionMap.get(templateId) || []
          
          // Calculate hours for this response
          let hours = 0
          for (const q of questions) {
            const text = (q.text || "").toLowerCase()
            const isTimeSaving = q.type === "time_saving" ||
              text.includes("hour") ||
              text.includes("time saved") ||
              text.includes("time saving") ||
              text.includes("minutes saved")
            
            if (isTimeSaving) {
              const val = answers[q.id]
              if (val !== undefined && val !== null && val !== "") {
                const numVal = typeof val === "number" ? val : parseFloat(String(val))
                if (!isNaN(numVal) && numVal > 0) {
                  hours += numVal
                }
              }
            }
          }
          
          return {
            id: r.id,
            templateId,
            templateName: (data.templateName as string) || "Unknown Template",
            weekOf: (data.weekOf as string) || "",
            completedAt: (data.completedAt as string) || "",
            updatedAt: (data.updatedAt as string) || "",
            createdAt: (data.createdAt as string) || "",
            status: (data.status as string) || "completed",
            answers,
            totalHours: Math.round(hours * 10) / 10,
          }
        })
        .sort((a, b) => {
          const aDate = a.completedAt || a.updatedAt || a.createdAt || ""
          const bDate = b.completedAt || b.updatedAt || b.createdAt || ""
          return bDate.localeCompare(aDate)
        })
      
      setScorecards(allUserResponses)
      
      // Calculate stats
      const completedOnly = allUserResponses.filter((r) => r.status !== "draft")
      const total = completedOnly.reduce((sum, r) => sum + r.totalHours, 0)
      setTotalHours(Math.round(total * 10) / 10)
      setScorecardsCount(completedOnly.length)
      setAvgHoursPerWeek(completedOnly.length > 0 ? Math.round((total / completedOnly.length) * 10) / 10 : 0)
      
      // Calculate streak (consecutive weeks)
      let currentStreak = 0
      const sortedByDate = [...completedOnly].sort(
        (a, b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime()
      )
      if (sortedByDate.length > 0) {
        currentStreak = 1
        for (let i = 1; i < sortedByDate.length; i++) {
          const prev = new Date(sortedByDate[i - 1].weekOf)
          const curr = new Date(sortedByDate[i].weekOf)
          const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
          if (diffDays <= 8) {
            currentStreak++
          } else {
            break
          }
        }
      }
      setStreak(currentStreak)
      
    } catch (err) {
      console.error("Failed to fetch user data:", err)
    } finally {
      setLoading(false)
    }
  }, [userId])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleMarkDraftCompleted = useCallback(
    async (response: ScorecardResponse) => {
      if (response.status !== "draft") return
      const ok = confirm(
        "Mark this draft as completed?\n\nThis will set status to completed and set completedAt to now.",
      )
      if (!ok) return

      try {
        setCompletingId(response.id)
        await updateDocument(COLLECTIONS.RESPONSES, response.id, {
          status: "completed",
          completedAt: new Date().toISOString(),
        })
        await fetchData()
      } catch (err) {
        console.error("Failed to mark draft completed:", err)
        alert("Failed to mark draft completed. Please try again.")
      } finally {
        setCompletingId(null)
      }
    },
    [fetchData],
  )
  
  // Load template questions when scorecard is selected
  useEffect(() => {
    async function loadQuestions() {
      if (!selectedScorecard) {
        setTemplateQuestions([])
        return
      }
      try {
        const tmpl = await getDocument(COLLECTIONS.TEMPLATES, selectedScorecard.templateId)
        if (tmpl) {
          const data = tmpl as Record<string, unknown>
          setTemplateQuestions((data.questions as TemplateQuestion[]) || [])
        }
      } catch (err) {
        console.error("Failed to load template:", err)
      }
    }
    loadQuestions()
  }, [selectedScorecard])
  
  // Filter scorecards by time period
  const filteredScorecards = scorecards.filter((sc) => {
    if (!showDrafts && sc.status === "draft") return false
    if (timePeriod === "all") return true
    const dateStr = sc.completedAt || sc.updatedAt || sc.createdAt || ""
    const completedDate = new Date(dateStr)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const yearStart = new Date(now.getFullYear(), 0, 1)
    
    switch (timePeriod) {
      case "last-30": return completedDate >= thirtyDaysAgo
      case "last-90": return completedDate >= ninetyDaysAgo
      case "ytd": return completedDate >= yearStart
      default: return true
    }
  })
  
  if (!(isSuperAdmin || isCompanyAdmin)) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">User not found.</p>
        <Link href="/admin/users">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </Link>
      </div>
    )
  }
  
  const fullName = `${userData.firstName} ${userData.lastName}`.trim() || userData.email
  
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
              <p className="text-sm text-muted-foreground">{userData.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userData.organizationName && (
            <Badge variant="outline">{userData.organizationName}</Badge>
          )}
          {userData.department && (
            <Badge variant="secondary">{userData.department}</Badge>
          )}
          <Badge className={userData.status === "active" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}>
            {userData.status}
          </Badge>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Hours Saved</p>
              <p className="text-2xl font-bold text-foreground">{totalHours}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Hours/Week</p>
              <p className="text-2xl font-bold text-foreground">{avgHoursPerWeek}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scorecards</p>
              <p className="text-2xl font-bold text-foreground">{scorecardCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className="text-2xl font-bold text-foreground">{streak} week{streak !== 1 ? "s" : ""}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Scorecards Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scorecard History</CardTitle>
              <CardDescription>View completed scorecards and saved drafts for this user</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={showDrafts ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowDrafts((v) => !v)}
              >
                {showDrafts ? "Showing drafts" : "Hiding drafts"}
              </Button>
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="last-30">Last 30 Days</SelectItem>
                  <SelectItem value="last-90">Last 90 Days</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredScorecards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">No scorecards found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This user has no completed scorecards{showDrafts ? " or saved drafts" : ""} yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredScorecards.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setSelectedScorecard(selectedScorecard?.id === sc.id ? null : sc)}
                  className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                    selectedScorecard?.id === sc.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{sc.weekOf}</p>
                      <p className="text-xs text-muted-foreground">
                        {sc.status === "draft"
                          ? `Last saved ${new Date(sc.updatedAt || sc.createdAt || sc.completedAt).toLocaleString()}`
                          : `Completed ${new Date(sc.completedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{sc.templateName}</Badge>
                    {sc.status === "draft" && <Badge variant="outline">Draft</Badge>}
                    {sc.status === "draft" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={completingId === sc.id}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleMarkDraftCompleted(sc)
                        }}
                      >
                        {completingId === sc.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Mark completed
                      </Button>
                    )}
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{sc.totalHours} hrs</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* Expanded scorecard details */}
          {selectedScorecard && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h4 className="mb-3 font-medium text-foreground">Scorecard Details - {selectedScorecard.weekOf}</h4>
              <div className="flex flex-col gap-2">
                {templateQuestions.map((q) => {
                  const answer = selectedScorecard.answers[q.id]
                  return (
                    <div key={q.id} className="flex items-start justify-between rounded-lg bg-background p-3">
                      <p className="flex-1 text-sm text-foreground">{q.text}</p>
                      <p className="ml-4 font-medium text-primary">
                        {answer !== undefined && answer !== null && answer !== "" ? String(answer) : "-"}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
