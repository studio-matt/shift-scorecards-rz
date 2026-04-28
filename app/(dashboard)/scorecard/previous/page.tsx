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
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, Trash2, Building2, Clock, Search, Upload, FileDown, Info, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createDocument } from "@/lib/firestore"
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
  userIds: Set<string> // Track unique users for filtering
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
  const [selectedUser, setSelectedUser] = useState("all")
  const [timePeriod, setTimePeriod] = useState("all")
  
  // Check if user is super admin (can see all companies)
  // Note: "admin" role = super admin in the database
  const isSuperAdmin = user?.role === "admin"
  // Check if user is any admin type (can filter by department)
  const isAdmin = user?.role === "admin" || user?.role === "company_admin"
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; orgId: string; department: string }>>([])
  const userOrgId = user?.organizationId
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; questions: TemplateQuestion[] }>>([])
  
  // Import state
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importOrg, setImportOrg] = useState("")
  const [importTemplate, setImportTemplate] = useState("")
  const [importWeekOf, setImportWeekOf] = useState("")
  const [importStartDate, setImportStartDate] = useState("")
  const [importEndDate, setImportEndDate] = useState("")
  const [importing, setImporting] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

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
      const orgNameToIdMap = new Map<string, string>() // For matching by company name
      const orgsList: Array<{ id: string; name: string }> = []
      for (const org of orgDocs) {
        const data = org as Record<string, unknown>
        const name = (data.name as string) || "Unknown Organization"
        orgNameMap.set(org.id, name)
        orgNameToIdMap.set(name.toLowerCase(), org.id)
        orgsList.push({ id: org.id, name })
      }
      setOrgs(orgsList.sort((a, b) => a.name.localeCompare(b.name)))
      
      // Determine user's organization ID (by organizationId or by matching company name)
      let userOrgId = user?.organizationId
      if (!userOrgId && user?.company) {
        userOrgId = orgNameToIdMap.get(user.company.toLowerCase())
      }
      
      // Build user department map, collect unique departments, and build users list for filtering
      // For non-super-admins, only include departments/users from their organization
      const userDeptMap = new Map<string, string>()
      const deptSet = new Set<string>()
      const usersList: Array<{ id: string; name: string; orgId: string; department: string }> = []
      
      for (const u of userDocs) {
        const data = u as Record<string, unknown>
        const dept = (data.department as string) || ""
        const userOrgIdField = (data.organizationId as string) || ""
        const userCompany = (data.company as string) || ""
        const firstName = (data.firstName as string) || ""
        const lastName = (data.lastName as string) || ""
        const fullName = `${firstName} ${lastName}`.trim()
        
        // Determine user's org ID
        const userResolvedOrgId = userOrgIdField || orgNameToIdMap.get(userCompany.toLowerCase()) || ""
        
        // Match user to organization
        const userBelongsToOrg = userOrgIdField === userOrgId || 
          (userCompany && orgNameToIdMap.get(userCompany.toLowerCase()) === userOrgId)
        
        if (dept) {
          userDeptMap.set(u.id, dept)
          // Only add to department list if super admin OR user belongs to same org
          if (isSuperAdmin || userBelongsToOrg) {
            deptSet.add(dept)
          }
        }
        
        // Build users list for admins to filter by user
        if (fullName && (isSuperAdmin || userBelongsToOrg)) {
          usersList.push({
            id: u.id,
            name: fullName,
            orgId: userResolvedOrgId,
            department: dept,
          })
        }
      }
      setDepartments(Array.from(deptSet).sort())
      setUsers(usersList.sort((a, b) => a.name.localeCompare(b.name)))
      
      // Build template question map for finding time_saving questions
      const templateQuestionMap = new Map<string, TemplateQuestion[]>()
      const templatesList: Array<{ id: string; name: string; questions: TemplateQuestion[] }> = []
      for (const tmpl of templateDocs) {
        const data = tmpl as Record<string, unknown>
        const qs = (data.questions as TemplateQuestion[]) || []
        templateQuestionMap.set(tmpl.id, qs)
        templatesList.push({
          id: tmpl.id,
          name: (data.name as string) || "Unnamed Template",
          questions: qs,
        })
      }
      setTemplates(templatesList)
      
      // Parse responses
      const allResponses: RawResponse[] = responseDocs.map((d) => {
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
      
      // Debug: Log org IDs in responses vs organizations
      const responseOrgIds = new Set(allResponses.map(r => r.organizationId))
      const knownOrgIds = new Set(orgsList.map(o => o.id))
      console.log("[v0] Organizations in /organizations collection:", orgsList.map(o => ({ id: o.id, name: o.name })))
      console.log("[v0] Organization IDs found in responses:", Array.from(responseOrgIds))
      console.log("[v0] Response org IDs NOT in organizations collection:", Array.from(responseOrgIds).filter(id => !knownOrgIds.has(id)))
      
      // Filter responses based on user role:
      // - Super admins see all responses (aggregated by org)
      // - Admin/company_admin see their org's responses (aggregated)
      // - Regular users see ONLY their own responses (grouped by week)
      let responses: RawResponse[]
      console.log("[v0] User role:", user?.role, "isSuperAdmin:", isSuperAdmin, "isAdmin:", isAdmin)
      console.log("[v0] Total responses fetched:", allResponses.length)
      if (isSuperAdmin) {
        responses = allResponses
        console.log("[v0] Super admin - using all responses")
      } else if (isAdmin) {
        // Admins see their org's responses (aggregated view)
        responses = allResponses.filter((r) => 
          r.organizationId === userOrgId || r.userId === user?.id
        )
      } else {
        // Regular users see ONLY their own responses, grouped by week
        responses = allResponses.filter((r) => r.userId === user?.id)
      }
      
      // Group responses by weekOf:
      // - Admins: group by organization + weekOf (aggregated across org)
      // - Regular users: group by weekOf only (their scorecards per week)
      const grouped = new Map<string, AggregatedScorecard>()
      
      for (const r of responses) {
        // Group by org+week for admins, just week for regular users
        const key = isAdmin ? `${r.organizationId}__${r.weekOf}` : `user__${r.weekOf}`
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
          const userIdSet = new Set<string>()
          if (userDept) deptSet.add(userDept)
          userIdSet.add(r.userId)
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
            userIds: userIdSet,
          })
        } else {
          const existing = grouped.get(key)!
          existing.responseIds.push(r.id)
          existing.totalHours += hours
          existing.responseCount += 1
          existing.avgHours = Math.round((existing.totalHours / existing.responseCount) * 10) / 10
          if (userDept) existing.departments.add(userDept)
          existing.userIds.add(r.userId)
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
      
      console.log("[v0] Grouped scorecards count:", aggregated.length)
      console.log("[v0] First 5 grouped scorecards:", aggregated.slice(0, 5).map(s => ({
        org: s.organizationName,
        orgId: s.organizationId,
        weekOf: s.weekOf,
        count: s.responseCount
      })))
      
      setScorecards(aggregated)
    } catch (err) {
      console.error("Failed to fetch past scorecards:", err)
    } finally {
      setLoading(false)
    }
  }, [user, isSuperAdmin])

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
      let filtered = responseDocs
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
      
      // For non-admin users, only show their own responses
      if (!isAdmin && user?.id) {
        filtered = filtered.filter((r) => r.userId === user.id)
      }
      
      setSelectedResponses(filtered)
    } catch (err) {
      console.error("Failed to fetch template questions:", err)
    } finally {
      setQuestionsLoading(false)
    }
  }

  const selected = scorecards.find((s) => s.key === selectedKey)
  
  // Download scorecard import template
  function handleDownloadTemplate() {
    const selectedTmpl = templates.find((t) => t.id === importTemplate)
    if (!selectedTmpl) {
      // Generic template with example structure
      const csv = `question,questionType,value
"How many hours did AI save you this week?",time_saving,"1-2 hours"
"Rate your confidence in AI tools",confidence,8
"What tools did you use?",text,"ChatGPT, Copilot"
"Additional comments",text,"AI helped with research"`
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "scorecard-import-template.csv"
      a.click()
      URL.revokeObjectURL(url)
      return
    }
    
    // Generate template based on selected template's questions
    const rows = ["question,questionType,value"]
    for (const q of selectedTmpl.questions) {
      const qType = q.type || "text"
      let exampleValue = ""
      if (qType === "time_saving") exampleValue = "1-2 hours"
      else if (qType === "confidence" || qType === "slider") exampleValue = "7"
      else exampleValue = "Example response"
      rows.push(`"${q.text.replace(/"/g, '""')}",${qType},"${exampleValue}"`)
    }
    const csv = rows.join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `scorecard-import-${selectedTmpl.name.replace(/\s+/g, "-").toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // Handle CSV file selection
  function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setImportFile(file)
  }
  
  // Import scorecard responses from CSV
  async function handleImport() {
    if (!importFile || !importOrg || !importTemplate || !importWeekOf) {
      alert("Please fill in all fields and select a CSV file.")
      return
    }
    
    setImporting(true)
    try {
      const text = await importFile.text()
      const lines = text.split("\n").filter((l) => l.trim())
      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
      
      const colIdx = {
        question: headers.findIndex((h) => h.includes("question") && !h.includes("type")),
        questionType: headers.findIndex((h) => h.includes("type")),
        value: headers.findIndex((h) => h.includes("value")),
      }
      
      if (colIdx.question === -1 || colIdx.value === -1) {
        alert("CSV must have 'question' and 'value' columns.")
        setImporting(false)
        return
      }
      
      const selectedTmpl = templates.find((t) => t.id === importTemplate)
      if (!selectedTmpl) {
        alert("Selected template not found.")
        setImporting(false)
        return
      }
      
      // Build answers object by matching question text to template question IDs
      const answers: Record<string, number | string> = {}
      for (let i = 1; i < lines.length; i++) {
        // Parse CSV line handling quoted values
        const parts = lines[i].match(/("([^"]|"")*"|[^,]*)(,("([^"]|"")*"|[^,]*))*$/g)?.[0]?.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/) || []
        const cleanParts = parts.map((p) => p.trim().replace(/^"|"$/g, "").replace(/""/g, '"'))
        
        const questionText = cleanParts[colIdx.question] || ""
        const value = cleanParts[colIdx.value] || ""
        
        // Find matching template question
        const matchingQ = selectedTmpl.questions.find((q) => 
          q.text.toLowerCase().trim() === questionText.toLowerCase().trim()
        )
        
        if (matchingQ && value) {
          // Parse value based on question type
          const qType = matchingQ.type || "text"
          if (qType === "slider" || qType === "confidence") {
            answers[matchingQ.id] = parseFloat(value) || 0
          } else {
            answers[matchingQ.id] = value
          }
        }
      }
      
      // Create response document
      const selectedOrgData = orgs.find((o) => o.id === importOrg)
      await createDocument(COLLECTIONS.RESPONSES, {
        templateId: importTemplate,
        templateName: selectedTmpl.name,
        organizationId: importOrg,
        organizationName: selectedOrgData?.name || "",
        userId: user?.id || "import",
        weekOf: importWeekOf,
        startDate: importStartDate || importWeekOf, // Default to weekOf if not provided
        endDate: importEndDate || "",
        completedAt: new Date().toISOString(),
        answers,
        importedAt: new Date().toISOString(),
      })
      
      // Reset and refresh
      setImportFile(null)
      setImportOrg("")
      setImportTemplate("")
      setImportWeekOf("")
      setImportStartDate("")
      setImportEndDate("")
      setImportModalOpen(false)
      fetchScorecards()
      alert("Scorecard imported successfully!")
    } catch (err) {
      console.error("Import error:", err)
      alert("Failed to import scorecard. Please check the CSV format.")
    } finally {
      setImporting(false)
    }
  }
  
  // Filter scorecards by search query, org, department, user, and time period
  const filteredScorecards = scorecards.filter((sc) => {
    // Org filter
    if (selectedOrg !== "all" && sc.organizationId !== selectedOrg) return false
    
    // Department filter - scorecard has responses from this department
    if (selectedDept !== "all" && !sc.departments.has(selectedDept)) return false
    
    // User filter - scorecard has responses from this user
    if (selectedUser !== "all" && !sc.userIds.has(selectedUser)) return false
    
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

  // DEBUG: Temporary debug info - remove after fixing
  const debugInfo = {
    totalScorecards: scorecards.length,
    filteredCount: filteredScorecards.length,
    selectedOrg,
    orgsAvailable: orgs.length,
    scorecardsOrgs: [...new Set(scorecards.map(s => s.organizationId))],
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
            {/* Only show response count and avg for admins (aggregated view) */}
            {isAdmin && (
              <>
                <Badge variant="secondary" className="text-xs">
                  {selected.responseCount} response{selected.responseCount !== 1 ? "s" : ""}
                </Badge>
                <Badge className="bg-primary text-primary-foreground text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {selected.avgHours} hrs avg
                </Badge>
              </>
            )}
            {/* For regular users, show their total hours (not avg) */}
            {!isAdmin && (
              <Badge className="bg-primary text-primary-foreground text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {selected.totalHours} hrs saved
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-2"
              onClick={() => {
                // Build CSV with raw data for audit trail
                const csvRows: string[] = []
                
                // Header row
                csvRows.push([
                  "Response ID",
                  "User ID",
                  "Organization",
                  "Week Of",
                  "Completed At",
                  "Question ID",
                  "Question Text",
                  "Question Type",
                  "Raw Value"
                ].map(h => `"${h}"`).join(","))
                
                // Data rows - one row per question per response
                for (const response of selectedResponses) {
                  for (const q of questions) {
                    const rawValue = response.answers[q.id]
                    csvRows.push([
                      response.id,
                      response.userId,
                      selected.organizationName,
                      selected.weekOf,
                      response.completedAt,
                      q.id,
                      q.text,
                      q.type,
                      rawValue !== undefined && rawValue !== null ? String(rawValue) : ""
                    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
                  }
                }
                
                // Download CSV
                const csvContent = csvRows.join("\n")
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
                const url = URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.href = url
                link.download = `${selected.organizationName.replace(/[^a-zA-Z0-9]/g, "_")}_${selected.weekOf}_raw_data.csv`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
              }}
            >
              <FileDown className="h-4 w-4" />
              Export Raw Data
            </Button>
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
                              {/* For regular users (single response), show value directly. For admins (aggregated), show avg */}
                              {isAdmin ? `${avg} ${q.type === "time_saving" ? "hrs" : ""} avg` : `${numericValues[0]} ${q.type === "time_saving" ? "hrs" : ""}`}
                            </span>
                            {/* Only show "from X responses" for admins */}
                            {isAdmin && (
                              <span className="text-xs text-muted-foreground">
                                from {numericValues.length} response{numericValues.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        )}
                        {q.type === "text" && textValues.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {/* For regular users, show just their response. For admins, show up to 3 */}
                            {(isAdmin ? textValues.slice(0, 3) : textValues.slice(0, 1)).map((val, i) => (
                              <p key={i} className="rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                                {val as string}
                              </p>
                            ))}
                            {isAdmin && textValues.length > 3 && (
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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
  Previous Scorecards
  </h1>
  <p className="mt-1 text-muted-foreground">
  {isAdmin ? "View past scorecard submissions and results by organization." : "View your past scorecard submissions."}
  </p>
        </div>
        
        {/* Import Button */}
        <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Import Scorecard
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Scorecard from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV file with scorecard responses. Match questions by their exact text.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col gap-4 py-4">
              {/* Organization */}
              <div className="flex flex-col gap-2">
                <Label>Organization</Label>
                <Select value={importOrg} onValueChange={setImportOrg}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Template */}
              <div className="flex flex-col gap-2">
                <Label>Template</Label>
                <Select value={importTemplate} onValueChange={setImportTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>{tmpl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Week Of */}
              <div className="flex flex-col gap-2">
                <Label>Week Of (Scorecard Date)</Label>
                <Input
                  type="date"
                  value={importWeekOf}
                  onChange={(e) => setImportWeekOf(e.target.value)}
                />
              </div>
              
              {/* Start/End Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Scorecard Start Date</Label>
                  <Input
                    type="date"
                    value={importStartDate}
                    onChange={(e) => setImportStartDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">When this scorecard period begins</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Scorecard End Date</Label>
                  <Input
                    type="date"
                    value={importEndDate}
                    onChange={(e) => setImportEndDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">When this scorecard expires</p>
                </div>
              </div>
              
              {/* CSV Upload */}
              <div className="flex flex-col gap-2">
                <Label>CSV File</Label>
                <label
                  htmlFor="scorecard-csv-upload"
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  <Upload className="h-4 w-4" />
                  {importFile ? (
                    <span className="font-medium text-foreground">{importFile.name}</span>
                  ) : (
                    "Click to upload CSV file"
                  )}
                </label>
                <input
                  id="scorecard-csv-upload"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleImportFileChange}
                />
              </div>
              
              {/* Download Template & Legend */}
              <div className="flex items-center justify-between border-t border-border pt-4">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <FileDown className="h-4 w-4" />
                  Download CSV Template
                </button>
                <button
                  type="button"
                  onClick={() => setShowLegend(!showLegend)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Info className="h-4 w-4" />
                  {showLegend ? "Hide" : "Show"} Value Legend
                </button>
              </div>
              
              {/* Legend */}
              {showLegend && (
                <div className="rounded-lg border border-border bg-muted/50 p-4 max-h-80 overflow-y-auto">
                  <h4 className="mb-3 font-medium text-foreground">Question Types & Valid Values</h4>
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <p className="font-medium text-foreground">time_saving</p>
                      <p className="text-xs text-muted-foreground mb-1">Hours saved - used in Hours Saved calculations</p>
                      <ul className="ml-4 list-disc text-muted-foreground text-xs">
                        <li>&quot;Not using AI yet&quot; = 0 hrs</li>
                        <li>&quot;30 min - 1 hour&quot; = 0.75 hrs</li>
                        <li>&quot;1-2 hours&quot; = 1.5 hrs</li>
                        <li>&quot;2-4 hours&quot; = 3 hrs</li>
                        <li>&quot;4+ hours&quot; = 5.5 hrs</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">time_saving_minutes</p>
                      <p className="text-xs text-muted-foreground mb-1">Minutes saved - midpoint rounded up</p>
                      <ul className="ml-4 list-disc text-muted-foreground text-xs">
                        <li>&quot;Under 2 min&quot; = 1 min</li>
                        <li>&quot;2-5 min&quot; = 4 min</li>
                        <li>&quot;6-10 min&quot; = 8 min</li>
                        <li>&quot;11-15 min&quot; = 13 min</li>
                        <li>&quot;16+ min&quot; = 20 min</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">confidence</p>
                      <p className="text-xs text-muted-foreground mb-1">1-10 scale for confidence metrics</p>
                      <p className="ml-4 text-muted-foreground text-xs">Number 1-10 (e.g., &quot;7&quot; or &quot;8&quot;)</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">scale</p>
                      <p className="text-xs text-muted-foreground mb-1">Generic 1-10 scale for ratings</p>
                      <p className="ml-4 text-muted-foreground text-xs">Number 1-10 (e.g., &quot;6&quot;)</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">number</p>
                      <p className="text-xs text-muted-foreground mb-1">Any numeric input</p>
                      <p className="ml-4 text-muted-foreground text-xs">Any number (e.g., &quot;5&quot;, &quot;12&quot;)</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">multichoice</p>
                      <p className="text-xs text-muted-foreground mb-1">Multiple choice selection</p>
                      <p className="ml-4 text-muted-foreground text-xs">Option value (e.g., &quot;A&quot;, &quot;B&quot;, &quot;C&quot;)</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">win</p>
                      <p className="text-xs text-muted-foreground mb-1">Biggest win - shown in Win of the Month</p>
                      <p className="ml-4 text-muted-foreground text-xs">Text narrative of achievement</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">goals</p>
                      <p className="text-xs text-muted-foreground mb-1">Weekly goals with completion tracking</p>
                      <p className="ml-4 text-muted-foreground text-xs">Text describing goals</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">text</p>
                      <p className="text-xs text-muted-foreground mb-1">Free-form text response</p>
                      <p className="ml-4 text-muted-foreground text-xs">Any text</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={importing || !importFile || !importOrg || !importTemplate || !importWeekOf}
                className="w-full"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import Scorecard"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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

        {/* Company dropdown - only visible to super admins */}
        {isSuperAdmin && (
          <Select
            value={selectedOrg}
            onValueChange={(val) => {
              setSelectedOrg(val)
              setSelectedDept("all") // Reset dept when org changes
              setSelectedUser("all") // Reset user when org changes
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

        {/* Department dropdown - only visible to admins */}
        {isAdmin && (
          <Select 
            value={selectedDept} 
            onValueChange={(val) => {
              setSelectedDept(val)
              setSelectedUser("all") // Reset user when dept changes
            }}
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
        )}

        {/* User dropdown - only visible to admins */}
        {isAdmin && (
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users
                .filter((u) => {
                  // Filter users by selected org/dept
                  if (selectedOrg !== "all" && u.orgId !== selectedOrg) return false
                  if (selectedDept !== "all" && u.department !== selectedDept) return false
                  return true
                })
                .map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}

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
  Completed {formatShort(sc.latestCompletedAt)}{isAdmin && ` · ${sc.responseCount} response${sc.responseCount !== 1 ? "s" : ""}`}
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
            {/* DEBUG INFO - remove after fixing */}
            <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-left font-mono">
              <p>DEBUG: Total scorecards loaded: {debugInfo.totalScorecards}</p>
              <p>DEBUG: After filtering: {debugInfo.filteredCount}</p>
              <p>DEBUG: Selected org filter: {debugInfo.selectedOrg}</p>
              <p>DEBUG: Orgs in dropdown: {debugInfo.orgsAvailable}</p>
              <p>DEBUG: Org IDs in scorecards: {debugInfo.scorecardsOrgs.join(", ") || "none"}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
