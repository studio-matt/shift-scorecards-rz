"use client"

import { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { ArrowLeft, Clock, TrendingUp, Award, CalendarDays, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  getDocument,
  getDocuments,
  getUserResponses,
  getUserResponsesUnordered,
  updateDocument,
  getUsersByEmailAll,
  getOrganizations,
  COLLECTIONS,
} from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import { parseTimeValue } from "@/lib/dashboard-data"
import { authHeaders, syncUserProfileMirrorAfterUserDocUpdate } from "@/lib/api-client"

interface Organization {
  id: string
  name: string
  departments?: string[]
}

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
  authId?: string
}

interface IdentityCandidate {
  id: string
  authId?: string
  organizationId?: string
  department?: string
  createdAt?: string
  status?: string
  completedCount: number
  draftCount: number
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
  const { isSuperAdmin, isCompanyAdmin, isActuallySuperAdmin } = useAuth()

  function parseDateLike(value: unknown): Date | null {
    if (!value) return null
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value)
      return isNaN(d.getTime()) ? null : d
    }
    if (typeof value === "object") {
      const v = value as { toDate?: () => unknown; seconds?: unknown; nanoseconds?: unknown }
      if (typeof v.toDate === "function") {
        const d = v.toDate()
        return d instanceof Date && !isNaN(d.getTime()) ? d : null
      }
      if (typeof v.seconds === "number") {
        const nanos = typeof v.nanoseconds === "number" ? v.nanoseconds : 0
        const d = new Date(v.seconds * 1000 + Math.floor(nanos / 1e6))
        return isNaN(d.getTime()) ? null : d
      }
    }
    return null
  }

  function dateLikeToIsoString(value: unknown): string {
    return parseDateLike(value)?.toISOString() ?? ""
  }

  function formatDateTime(value: unknown): string {
    const date = parseDateLike(value)
    return date ? date.toLocaleString() : "-"
  }

  function formatDateOnly(value: unknown): string {
    const date = parseDateLike(value)
    return date ? date.toLocaleDateString() : "-"
  }

  function scorecardSortTime(response: ScorecardResponse): number {
    return (
      parseDateLike(response.completedAt)?.getTime() ??
      parseDateLike(response.updatedAt)?.getTime() ??
      parseDateLike(response.createdAt)?.getTime() ??
      0
    )
  }

  function scorecardHistoryKey(response: ScorecardResponse): string {
    const dateKey =
      response.weekOf ||
      response.completedAt.slice(0, 10) ||
      response.updatedAt?.slice(0, 10) ||
      response.createdAt?.slice(0, 10) ||
      response.id
    return `${response.templateId || response.templateName}__${dateKey}`
  }

  function collapseScorecardHistory(responses: ScorecardResponse[]): ScorecardResponse[] {
    const byScorecard = new Map<
      string,
      { completed?: ScorecardResponse; draft?: ScorecardResponse }
    >()

    for (const response of responses) {
      const key = scorecardHistoryKey(response)
      const existing = byScorecard.get(key) ?? {}
      const bucket = response.status === "draft" ? "draft" : "completed"
      const current = existing[bucket]
      if (!current || scorecardSortTime(response) > scorecardSortTime(current)) {
        existing[bucket] = response
      }
      byScorecard.set(key, existing)
    }

    return Array.from(byScorecard.values())
      .map((entry) => entry.completed ?? entry.draft)
      .filter((response): response is ScorecardResponse => Boolean(response))
      .sort((a, b) => scorecardSortTime(b) - scorecardSortTime(a))
  }
  
  const [userData, setUserData] = useState<UserData | null>(null)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileDraft, setProfileDraft] = useState<{
    firstName: string
    lastName: string
    email: string
    department: string
    role: string
    organizationId: string
    status: string
  } | null>(null)
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
  const [identityCandidates, setIdentityCandidates] = useState<IdentityCandidate[]>([])
  const [reassigningFrom, setReassigningFrom] = useState<string | null>(null)
  const [passwordDraft, setPasswordDraft] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [passwordWorking, setPasswordWorking] = useState(false)
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch user data
      const [userDoc, orgDocs] = await Promise.all([
        getDocument(COLLECTIONS.USERS, userId),
        getOrganizations(),
      ])
      if (!userDoc) {
        setLoading(false)
        return
      }
      
      const uData = userDoc as Record<string, unknown>

      const orgList = orgDocs.map((o) => ({
        id: o.id,
        name: (o as Record<string, unknown>).name as string,
        departments: ((o as Record<string, unknown>).departments as string[]) ?? [],
      })) as Organization[]
      setOrgs(orgList)
      
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
        createdAt: dateLikeToIsoString(uData.createdAt),
        authId: (uData.authId as string) || undefined,
      })

      // If not currently editing, keep draft in sync with latest DB values.
      setProfileDraft((prev) => {
        if (editingProfile && prev) return prev
        return {
          firstName: (uData.firstName as string) || "",
          lastName: (uData.lastName as string) || "",
          email: (uData.email as string) || "",
          department: (uData.department as string) || "",
          role: (uData.role as string) || "user",
          organizationId: (uData.organizationId as string) || "",
          status: (uData.status as string) || (uData.authId ? "active" : "pending"),
        }
      })

      // Identity diagnostics: find duplicate user docs by email and see which one holds responses.
      const email = ((uData.email as string) || "").toLowerCase()
      if (email) {
        try {
          const candidates = await getUsersByEmailAll(email, 25)
          const rows: IdentityCandidate[] = []
          for (const c of candidates) {
            const cd = c as unknown as Record<string, unknown>
            const respDocs = await getUserResponsesUnordered(c.id, 5000)
            const completedCount = respDocs.filter((r) => {
              const rd = r as unknown as Record<string, unknown>
              const status = (rd.status as string) ?? ""
              const completedAt = (rd.completedAt as string) ?? ""
              return status === "completed" || (completedAt && completedAt.trim().length > 0)
            }).length
            const draftCount = respDocs.filter((r) => {
              const rd = r as unknown as Record<string, unknown>
              return (rd.status as string) === "draft"
            }).length
            rows.push({
              id: c.id,
              authId: (cd.authId as string) || undefined,
              organizationId: (cd.organizationId as string) || undefined,
              department: (cd.department as string) || undefined,
              createdAt: dateLikeToIsoString(cd.createdAt) || undefined,
              status: (cd.authId as string) ? "active" : "pending",
              completedCount,
              draftCount,
            })
          }
          // Sort: most completed responses first, then drafts
          rows.sort(
            (a, b) =>
              b.completedCount - a.completedCount ||
              b.draftCount - a.draftCount ||
              String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
          )
          setIdentityCandidates(rows)
        } catch (e) {
          console.warn("[admin user detail] identity diagnostics failed", e)
          setIdentityCandidates([])
        }
      }
      
      // Fetch user's scorecard responses
      const authId = (uData.authId as string) || ""
      const [byUserId, byAuthId, templateDocs] = await Promise.all([
        // Use unordered so drafts (no completedAt) still appear
        getUserResponsesUnordered(userId),
        authId && authId !== userId ? getUserResponsesUnordered(authId) : Promise.resolve([]),
        getDocuments(COLLECTIONS.TEMPLATES),
      ])
      const responseDocs = (() => {
        const byId = new Map<string, { id: string } & Record<string, unknown>>()
        for (const r of [...byUserId, ...byAuthId]) {
          byId.set(r.id, r as unknown as { id: string } & Record<string, unknown>)
        }
        return Array.from(byId.values())
      })()
      
      // Build template question map
      const templateQuestionMap = new Map<string, TemplateQuestion[]>()
      for (const tmpl of templateDocs) {
        const data = tmpl as Record<string, unknown>
        const qs = (data.questions as TemplateQuestion[]) || []
        templateQuestionMap.set(tmpl.id, qs)
      }
      
      // Include BOTH completed + drafts (drafts are the autosaves / Save & Exit path)
      const allowedUserIds = new Set([userId, authId].filter(Boolean))
      const allUserResponses = responseDocs
        .filter((r) => {
          const data = r as Record<string, unknown>
          return allowedUserIds.has((data.userId as string) || "")
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
            completedAt: dateLikeToIsoString(data.completedAt),
            updatedAt: dateLikeToIsoString(data.updatedAt),
            createdAt: dateLikeToIsoString(data.createdAt),
            status: (data.status as string) || "completed",
            answers,
            totalHours: Math.round(hours * 10) / 10,
          }
        })
      const collapsedUserResponses = collapseScorecardHistory(allUserResponses)
      
      setScorecards(collapsedUserResponses)
      
      // Calculate stats
      const completedOnly = collapsedUserResponses.filter((r) => r.status !== "draft")
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
  }, [userId, editingProfile])
  
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
        const res = await fetch("/api/admin/complete-response", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ responseId: response.id }),
        })
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string; reason?: string } | null
          throw new Error(payload?.error || payload?.reason || `HTTP ${res.status}`)
        }
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

  const handleReassignResponses = useCallback(
    async (fromUserId: string) => {
      if (!userData) return
      if (fromUserId === userData.id) return
      const ok = confirm(
        `Reassign ALL responses from userId "${fromUserId}" to this user ("${userData.id}")?\n\nThis is useful if a user has duplicate accounts and their scorecards were saved on the other record.`,
      )
      if (!ok) return

      try {
        setReassigningFrom(fromUserId)
        const res = await fetch("/api/admin/reassign-responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ fromUserId, toUserId: userData.id }),
        })
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string; reason?: string } | null
          throw new Error(payload?.error || payload?.reason || `HTTP ${res.status}`)
        }
        await fetchData()
      } catch (err) {
        console.error("Failed to reassign responses:", err)
        alert("Failed to reassign responses. Please try again.")
      } finally {
        setReassigningFrom(null)
      }
    },
    [fetchData, userData],
  )

  const handleSetPassword = useCallback(async () => {
    if (!userData) return
    if (passwordDraft.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (passwordDraft !== passwordConfirm) {
      toast.error("Passwords do not match")
      return
    }

    try {
      setPasswordWorking(true)
      const res = await fetch("/api/admin/set-user-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          userDocId: userData.id,
          password: passwordDraft,
        }),
      })
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string
        createdAuthUser?: boolean
      }
      if (!res.ok) {
        throw new Error(payload.error || `HTTP ${res.status}`)
      }

      toast.success(
        payload.createdAuthUser
          ? "Password set and Firebase Auth account created"
          : "Password updated",
      )
      setPasswordDraft("")
      setPasswordConfirm("")
      await fetchData()
    } catch (error) {
      console.error("[admin user detail] failed to set password", error)
      toast.error(error instanceof Error ? error.message : "Failed to set password")
    } finally {
      setPasswordWorking(false)
    }
  }, [fetchData, passwordConfirm, passwordDraft, userData])
  
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

  if (selectedScorecard) {
    return (
      <div>
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setSelectedScorecard(null)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {fullName}
        </Button>

        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CalendarDays className="h-4 w-4" />
            {userData.organizationName || "Scorecard"}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {selectedScorecard.templateName || "Scorecard"}
          </h1>
          <p className="text-sm font-medium text-primary">
            {selectedScorecard.weekOf ? `Week of ${selectedScorecard.weekOf}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              {selectedScorecard.status === "draft"
                ? `Last saved ${formatDateTime(selectedScorecard.updatedAt || selectedScorecard.createdAt || selectedScorecard.completedAt)}`
                : `Completed ${formatDateOnly(selectedScorecard.completedAt)}`}
            </Badge>
            {selectedScorecard.status === "draft" && <Badge variant="outline">Draft</Badge>}
            <Badge className="bg-primary text-primary-foreground text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {selectedScorecard.totalHours} hrs saved
            </Badge>
            {selectedScorecard.status === "draft" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={completingId === selectedScorecard.id}
                onClick={() => handleMarkDraftCompleted(selectedScorecard)}
              >
                {completingId === selectedScorecard.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Mark completed
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {templateQuestions.map((q) => {
            const answer = selectedScorecard.answers[q.id]
            return (
              <Card key={q.id} className="border-border/60">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{q.text}</p>
                    <div className="mt-2">
                      {answer !== undefined && answer !== null && answer !== "" ? (
                        <span className="rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary inline-block">
                          {String(answer)}
                        </span>
                      ) : (
                        <p className="text-sm text-muted-foreground">No response</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {templateQuestions.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Template questions could not be loaded.
            </p>
          )}
        </div>
      </div>
    )
  }
  
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

      {/* Profile (super admin) */}
      {isActuallySuperAdmin && profileDraft && (
        <Card className="mb-6">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>User profile</CardTitle>
              <CardDescription>View and edit core user credentials and org assignment.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {editingProfile ? (
                <>
                  <Button
                    variant="outline"
                    disabled={savingProfile}
                    onClick={() => {
                      setEditingProfile(false)
                      setProfileDraft({
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        email: userData.email,
                        department: userData.department,
                        role: userData.role,
                        organizationId: userData.organizationId,
                        status: userData.status,
                      })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={savingProfile}
                    onClick={async () => {
                      try {
                        setSavingProfile(true)
                        const next = profileDraft
                        await updateDocument(COLLECTIONS.USERS, userData.id, {
                          firstName: next.firstName,
                          lastName: next.lastName,
                          email: next.email.toLowerCase(),
                          department: next.department,
                          role: next.role,
                          organizationId: next.organizationId,
                          status: next.status,
                          updatedAt: new Date().toISOString(),
                        })
                        await syncUserProfileMirrorAfterUserDocUpdate(userData.id)
                        toast.success("User profile updated")
                        setEditingProfile(false)
                        await fetchData()
                      } catch (e) {
                        console.error("[admin user detail] failed to save profile", e)
                        toast.error("Failed to update user profile")
                      } finally {
                        setSavingProfile(false)
                      }
                    }}
                  >
                    Save changes
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setEditingProfile(true)}
                >
                  Edit profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>First name</Label>
                <Input
                  value={profileDraft.firstName}
                  disabled={!editingProfile}
                  onChange={(e) => setProfileDraft({ ...profileDraft, firstName: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Last name</Label>
                <Input
                  value={profileDraft.lastName}
                  disabled={!editingProfile}
                  onChange={(e) => setProfileDraft({ ...profileDraft, lastName: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Email</Label>
                <Input
                  value={profileDraft.email}
                  disabled={!editingProfile}
                  onChange={(e) => setProfileDraft({ ...profileDraft, email: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Company</Label>
                <Select
                  value={profileDraft.organizationId}
                  onValueChange={(val) => setProfileDraft({ ...profileDraft, organizationId: val })}
                  disabled={!editingProfile}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Department</Label>
                <Input
                  value={profileDraft.department}
                  disabled={!editingProfile}
                  onChange={(e) => setProfileDraft({ ...profileDraft, department: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Role</Label>
                <Select
                  value={profileDraft.role}
                  onValueChange={(val) => setProfileDraft({ ...profileDraft, role: val })}
                  disabled={!editingProfile}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="company_admin">Company Admin</SelectItem>
                    <SelectItem value="admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select
                  value={profileDraft.status}
                  onValueChange={(val) => setProfileDraft({ ...profileDraft, status: val })}
                  disabled={!editingProfile}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">pending</SelectItem>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="staging">staging</SelectItem>
                    <SelectItem value="disabled">disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <span className="font-medium text-foreground">User doc id:</span>{" "}
                <span className="font-mono">{userData.id}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Auth UID:</span>{" "}
                <span className="font-mono">{userData.authId || "-"}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-medium text-foreground">Created:</span>{" "}
                {formatDateTime(userData.createdAt)}
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-muted/10 p-4">
              <div className="mb-4">
                <p className="text-sm font-medium text-foreground">Set user password</p>
                <p className="text-xs text-muted-foreground">
                  Super admins can set a temporary password when a user is locked out. If the
                  user does not yet have a Firebase Auth account, this will create and link one.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div className="flex flex-col gap-1.5">
                  <Label>New password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={passwordDraft}
                    onChange={(e) => setPasswordDraft(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Confirm password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={passwordWorking || passwordDraft.length === 0 || passwordConfirm.length === 0}
                  onClick={handleSetPassword}
                >
                  {passwordWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Set password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Identity diagnostics */}
      {identityCandidates.length > 1 && (
        <Card className="mb-6 border-amber-500/30">
          <CardHeader>
            <CardTitle>Identity Diagnostics</CardTitle>
            <CardDescription>
              Multiple user records share this email. Scorecards may be attached to a different user ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {identityCandidates.map((c) => {
                const isThis = c.id === userData.id
                const hasAny = c.completedCount + c.draftCount > 0
                return (
                  <div
                    key={c.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {isThis ? "This user record" : "Other user record"}
                        </p>
                        <p className="text-xs text-muted-foreground break-all">
                          id: {c.id}{c.authId ? ` · authId: ${c.authId}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {c.completedCount} completed · {c.draftCount} drafts
                        </Badge>
                        {isThis ? <Badge>Viewing</Badge> : null}
                        {!isThis && hasAny && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={reassigningFrom === c.id}
                            onClick={() => handleReassignResponses(c.id)}
                          >
                            {reassigningFrom === c.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Move responses here
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.organizationId ? `org: ${c.organizationId}` : "org: -"}{" "}
                      {c.department ? `· dept: ${c.department}` : ""}{" "}
                      {c.createdAt ? `· created: ${formatDateOnly(c.createdAt)}` : ""}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
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
                  onClick={() => setSelectedScorecard(sc)}
                  className="flex w-full items-center justify-between rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{sc.weekOf}</p>
                      <p className="text-xs text-muted-foreground">
                        {sc.status === "draft"
                          ? `Last saved ${(parseDateLike(sc.updatedAt) ?? parseDateLike(sc.createdAt) ?? parseDateLike(sc.completedAt))?.toLocaleString() ?? "-"}`
                          : `Completed ${formatDateOnly(sc.completedAt)}`}
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
        </CardContent>
      </Card>
    </div>
  )
}
