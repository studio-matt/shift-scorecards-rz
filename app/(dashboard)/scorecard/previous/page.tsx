"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, Trash2, Building2, Clock, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getDocuments, getDocument, deleteDocument, COLLECTIONS } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import { parseTimeValue } from "@/lib/dashboard-data"

interface RawResponse {
  id: string
  templateId: string
  templateName: string
  completedAt: string
  weekOf: string
  organizationId: string
  userId: string
  answers: Record<string, number | string>
}

interface AggregatedScorecard {
  key: string // org + weekOf
  organizationId: string
  organizationName: string
  templateId: string
  templateName: string
  weekOf: string
  latestCompletedAt: string
  responseIds: string[]
  totalHours: number
  responseCount: number
  avgHours: number
  departments: Set<string> // Track unique departments for filtering
}

interface TemplateQuestion {
  id: string
  text: string
  type: string
  min?: number
  max?: number
  order: number
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function formatShort(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

export default function PreviousScorecardsPage() {
  const { user } = useAuth()
  const [scorecards, setScorecards] = useState<AggregatedScorecard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [questions, setQuestions] = useState<TemplateQuestion[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [selectedResponses, setSelectedResponses] = useState<RawResponse[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrg, setSelectedOrg] = useState("all")
  const [selectedDept, setSelectedDept] = useState("all")
  const [timePeriod, setTimePeriod] = useState("all")
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([])
  const [departments, setDepartments] = useState<string[]>([])

  const fetchScorecards = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      
      // Fetch responses, organizations, templates, and users
      const [responseDocs, orgDocs, templateDocs, userDocs] = await Promise.all([
        getDocuments(COLLECTIONS.RESPONSES),
        getDocuments(COLLECTIONS.ORGANIZATIONS),
        getDocuments(COLLECTIONS.TEMPLATES),
        getDocuments(COLLECTIONS.USERS),
      ])
      
      // Build org name map and populate orgs list
      const orgNameMap = new Map<string, string>()
      const orgsList: Array<{ id: string; name: string }> = []
      for (const org of orgDocs) {
        const data = org as Record<string, unknown>
        const name = (data.name as string) || "Unknown Organization"
        orgNameMap.set(org.id, name)
        orgsList.push({ id: org.id, name })
      }
      setOrgs(orgsList.sort((a, b) => a.name.localeCompare(b.name)))
      
      // Build user department map and collect unique departments
      const userDeptMap = new Map<string, string>()
      const deptSet = new Set<string>()
      for (const u of userDocs) {
        const data = u as Record<string, unknown>
        const dept = (data.department as string) || ""
        if (dept) {
          userDeptMap.set(u.id, dept)
          deptSet.add(dept)
        }
      }
      setDepartments(Array.from(deptSet).sort())
      
      // Build template question map for finding time_saving questions
      const templateQuestionMap = new Map<string, TemplateQuestion[]>()
      for (const tmpl of templateDocs) {
        const data = tmpl as Record<string, unknown>
        const qs = (data.questions as TemplateQuestion[]) || []
        templateQuestionMap.set(tmpl.id, qs)
      }
      
      // Parse responses
      const responses: RawResponse[] = responseDocs.map((d) => {
        const data = d as Record<string, unknown>
        return {
          id: d.id,
          templateId: (data.templateId as string) ?? "",
          templateName: (data.templateName as string) ?? "",
          completedAt: (data.completedAt as string) ?? "",
          weekOf: (data.weekOf as string) ?? "",
          organizationId: (data.organizationId as string) ?? "",
          userId: (data.userId as string) ?? "",
          answers: (data.answers as Record<string, number | string>) ?? {},
        }
      })
      
      // Group by organization + weekOf
      const grouped = new Map<string, AggregatedScorecard>()
      
      for (const r of responses) {
        const key = `${r.organizationId}__${r.weekOf}`
        const userDept = userDeptMap.get(r.userId) || ""
        
        // Calculate hours from time_saving questions or questions with hour/time keywords
        let hours = 0
        const templateQuestions = templateQuestionMap.get(r.templateId) || []
        for (const q of templateQuestions) {
          const text = (q.text || "").toLowerCase()
          const isTimeSaving = q.type === "time_saving" ||
            text.includes("hour") ||
            text.includes("time saved") ||
            text.includes("time saving") ||
            text.includes("minutes saved")
          
          if (isTimeSaving) {
            const val = r.answers[q.id]
            if (val !== undefined && val !== null && val !== "") {
              hours += parseTimeValue(val)
            }
          }
        }
        
        if (!grouped.has(key)) {
          const deptSet = new Set<string>()
          if (userDept) deptSet.add(userDept)
          grouped.set(key, {
            key,
            organizationId: r.organizationId,
            organizationName: orgNameMap.get(r.organizationId) || "Unknown",
            templateId: r.templateId,
            templateName: r.templateName,
            weekOf: r.weekOf,
            latestCompletedAt: r.completedAt,
            responseIds: [r.id],
            totalHours: hours,
            responseCount: 1,
            avgHours: hours,
            departments: deptSet,
          })
        } else {
          const existing = grouped.get(key)!
          existing.responseIds.push(r.id)
          existing.totalHours += hours
          existing.responseCount += 1
          existing.avgHours = Math.round((existing.totalHours / existing.responseCount) * 10) / 10
          if (userDept) existing.departments.add(userDept)
          // Track latest completion
          if (new Date(r.completedAt) > new Date(existing.latestCompletedAt)) {
            existing.latestCompletedAt = r.completedAt
          }
        }
      }
      
      // Sort by latest completed date descending
      const aggregated = Array.from(grouped.values()).sort(
        (a, b) => new Date(b.latestCompletedAt).getTime() - new Date(a.latestCompletedAt).getTime()
      )
      
      setScorecards(aggregated)
    } catch (err) {
      console.error("Failed to fetch past scorecards:", err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchScorecards()
  }, [fetchScorecards])

  // When selecting a scorecard, load its template questions and responses
  async function handleSelect(sc: AggregatedScorecard) {
    setSelectedKey(sc.key)
    setQuestionsLoading(true)
    try {
      const tmpl = await getDocument(COLLECTIONS.TEMPLATES, sc.templateId)
      if (tmpl) {
        const data = tmpl as Record<string, unknown>
        const qs = (data.questions as TemplateQuestion[]) ?? []
        setQuestions(qs.sort((a, b) => a.order - b.order))
      }
      
      // Load the individual responses for this aggregated scorecard
      const responseDocs = await getDocuments(COLLECTIONS.RESPONSES)
      const filtered = responseDocs
        .filter((d) => sc.responseIds.includes(d.id))
        .map((d) => {
          const data = d as Record<string, unknown>
          return {
            id: d.id,
            templateId: (data.templateId as string) ?? "",
            templateName: (data.templateName as string) ?? "",
            completedAt: (data.completedAt as string) ?? "",
            weekOf: (data.weekOf as string) ?? "",
            organizationId: (data.organizationId as string) ?? "",
            userId: (data.userId as string) ?? "",
            answers: (data.answers as Record<string, number | string>) ?? {},
          }
        })
      setSelectedResponses(filtered)
    } catch (err) {
      console.error("Failed to fetch template questions:", err)
    } finally {
      setQuestionsLoading(false)
    }
  }

  const selected = scorecards.find((s) => s.key === selectedKey)
  
  // Filter scorecards by search query, org, department, and time period
  const filteredScorecards = scorecards.filter((sc) => {
    // Org filter
    if (selectedOrg !== "all" && sc.organizationId !== selectedOrg) return false
    
    // Department filter - scorecard has responses from this department
    if (selectedDept !== "all" && !sc.departments.has(selectedDept)) return false
    
    // Time period filter
    if (timePeriod !== "all") {
      const completedDate = new Date(sc.latestCompletedAt)
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      const lastQuarterStart = new Date(thisQuarter)
      lastQuarterStart.setMonth(lastQuarterStart.getMonth() - 3)
      const lastQuarterEnd = new Date(thisQuarter)
      lastQuarterEnd.setDate(lastQuarterEnd.getDate() - 1)
      const yearStart = new Date(now.getFullYear(), 0, 1)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      switch (timePeriod) {
        case "this-month":
          if (completedDate < thisMonth) return false
          break
        case "last-30":
          if (completedDate < thirtyDaysAgo) return false
          break
        case "this-quarter":
          if (completedDate < thisQuarter) return false
          break
        case "last-quarter":
          if (completedDate < lastQuarterStart || completedDate > lastQuarterEnd) return false
          break
        case "ytd":
          if (completedDate < yearStart) return false
          break
      }
    }
    
    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        sc.organizationName.toLowerCase().includes(query) ||
        sc.templateName.toLowerCase().includes(query) ||
        sc.weekOf.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  async function handleDelete(e: React.MouseEvent, sc: AggregatedScorecard) {
    e.stopPropagation()
    const count = sc.responseIds.length
    if (!confirm(`Are you sure you want to delete this scorecard? This will remove ${count} response${count !== 1 ? "s" : ""} and cannot be undone.`)) {
      return
    }
    try {
      // Delete all responses in this aggregated scorecard
      await Promise.all(sc.responseIds.map((id) => deleteDocument(COLLECTIONS.RESPONSES, id)))
      setScorecards((prev) => prev.filter((s) => s.key !== sc.key))
    } catch (err) {
      console.error("Failed to delete scorecard:", err)
      alert("Failed to delete scorecard. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (selected) {
    return (
      <div>
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => {
            setSelectedKey(null)
            setQuestions([])
            setSelectedResponses([])
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Previous Scorecards
        </Button>

        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Building2 className="h-4 w-4" />
            {selected.organizationName}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {selected.templateName || "Scorecard"}
          </h1>
          <p className="text-sm font-medium text-primary">
            {selected.weekOf ? `Week of ${selected.weekOf}` : ""}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              Completed {formatShort(selected.latestCompletedAt)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {selected.responseCount} response{selected.responseCount !== 1 ? "s" : ""}
            </Badge>
            <Badge className="bg-primary text-primary-foreground text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {selected.avgHours} hrs avg
            </Badge>
          </div>
        </div>

        {questionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map((q) => {
              // Compute aggregate stats for this question across all responses
              const values = selectedResponses
                .map((r) => r.answers[q.id])
                .filter((v) => v !== undefined && v !== null && v !== "")
              
              const numericValues = values
                .map((v) => typeof v === "number" ? v : parseTimeValue(v))
                .filter((v) => v > 0)
              
              const textValues = values.filter((v) => typeof v === "string" && isNaN(parseFloat(v)))
              
              const avg = numericValues.length > 0
                ? Math.round((numericValues.reduce((a, b) => a + b, 0) / numericValues.length) * 10) / 10
                : null
              
              return (
                <Card key={q.id} className="border-border/60">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {q.text}
                      </p>
                      <div className="mt-2">
                        {(q.type === "scale" || q.type === "number" || q.type === "confidence" || q.type === "time_saving") && avg !== null && (
                          <div className="flex items-center gap-3">
                            <span className="rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                              {avg} {q.type === "time_saving" ? "hrs" : ""} avg
                            </span>
                            <span className="text-xs text-muted-foreground">
                              from {numericValues.length} response{numericValues.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                        {q.type === "text" && textValues.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {textValues.slice(0, 3).map((val, i) => (
                              <p key={i} className="rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                                {val as string}
                              </p>
                            ))}
                            {textValues.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{textValues.length - 3} more response{textValues.length - 3 !== 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                        )}
                        {values.length === 0 && (
                          <p className="text-sm text-muted-foreground">No responses</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {questions.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Template questions could not be loaded.
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Previous Scorecards
        </h1>
        <p className="mt-1 text-muted-foreground">
          View past scorecard submissions and results by organization.
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoComplete="off"
          />
        </div>

        {/* Company dropdown */}
        <Select
          value={selectedOrg}
          onValueChange={(val) => {
            setSelectedOrg(val)
            setSelectedDept("all") // Reset dept when org changes
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

        {/* Department dropdown */}
        <Select value={selectedDept} onValueChange={setSelectedDept}>
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

        {/* Time period dropdown */}
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Time Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-30">Last 30 Days</SelectItem>
            <SelectItem value="this-quarter">This Quarter</SelectItem>
            <SelectItem value="last-quarter">Last Quarter</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        {filteredScorecards.map((sc) => (
          <Card
            key={sc.key}
            className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
            onClick={() => handleSelect(sc)}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                  <Building2 className="h-3 w-3" />
                  {sc.organizationName}
                </div>
                <CardTitle className="text-base">
                  {sc.weekOf ? `Week of ${sc.weekOf}` : sc.templateName || "Scorecard"}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Completed {formatShort(sc.latestCompletedAt)} · {sc.responseCount} response{sc.responseCount !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {sc.avgHours} hrs
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDelete(e, sc)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredScorecards.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">
              {searchQuery ? "No matching scorecards" : "No previous scorecards"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery ? "Try a different search term." : "Completed scorecards will appear here."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
