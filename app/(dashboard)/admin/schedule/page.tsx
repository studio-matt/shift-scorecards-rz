"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Timer,
  Trash2,
  Pause,
  Play,
} from "lucide-react"
import {
  getOrganizations,
  getDocuments,
  getAllReleases,
  filterScheduledReleases,
  filterActiveRelease,
  filterCompletedReleases,
  createDocument,
  updateDocument,
  deleteDocument,
  COLLECTIONS,
} from "@/lib/firestore"
import type { Organization, ScorecardRelease } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"

interface TemplateOption {
  id: string
  name: string
  status: string
  questionCount: number
}

export default function ScheduleReleasePage() {
  const { user } = useAuth()

  // Data from Firestore
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [scheduledReleases, setScheduledReleases] = useState<ScorecardRelease[]>([])
  const [activeRelease, setActiveRelease] = useState<ScorecardRelease | null>(null)
  const [completedReleases, setCompletedReleases] = useState<ScorecardRelease[]>([])
  const [pausedReleases, setPausedReleases] = useState<ScorecardRelease[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [selectedCompany, setSelectedCompany] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [scheduleType, setScheduleType] = useState("now")
  const [scheduledDateTime, setScheduledDateTime] = useState("")
  const [recurringFrequency, setRecurringFrequency] = useState("weekly")
  const [activeDays, setActiveDays] = useState("7")
  const [allUsersInGroup, setAllUsersInGroup] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentType, setSentType] = useState("")

  const activeOrg = orgs.find((o) => o.id === selectedCompany)

  // Only show published (non-draft) templates
  const publishedTemplates = templates.filter((t) => t.status !== "draft")

  const fetchData = useCallback(async () => {
    try {
      setDataLoading(true)
      const [orgDocs, tmplDocs, allReleases] = await Promise.all([
        getOrganizations(),
        getDocuments(COLLECTIONS.TEMPLATES),
        getAllReleases(),
      ])
      const scheduled = filterScheduledReleases(allReleases as unknown as Record<string, unknown>[])
      const active = filterActiveRelease(allReleases as unknown as Record<string, unknown>[])
      const completed = filterCompletedReleases(allReleases as unknown as Record<string, unknown>[])
      setOrgs(
        orgDocs.map((o: Record<string, unknown> & { id: string }) => ({
          id: o.id,
          name: (o.name as string) ?? "",
          departments: (o.departments as string[]) ?? [],
          createdAt: "",
          memberCount: (o.memberCount as number) ?? 0,
        })) as Organization[],
      )
      setTemplates(
        tmplDocs.map((d: Record<string, unknown> & { id: string }) => ({
          id: d.id,
          name: (d.name as string) ?? "",
          status: (d.status as string) ?? "active",
          questionCount: (d.questionCount as number) ?? (d.questions as unknown[])?.length ?? 0,
        })),
      )
      const paused = (allReleases as unknown as Record<string, unknown>[])
        .filter((r) => r.status === "paused")
      setScheduledReleases(scheduled as unknown as ScorecardRelease[])
      setActiveRelease(active as unknown as ScorecardRelease | null)
      setCompletedReleases(completed as unknown as ScorecardRelease[])
      setPausedReleases(paused as unknown as ScorecardRelease[])
    } catch (err) {
      console.error("Failed to load schedule data:", err)
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSend() {
    if (!selectedTemplate || !selectedCompany) return

    setSending(true)
    try {
      const template = publishedTemplates.find((t) => t.id === selectedTemplate)
      const org = orgs.find((o) => o.id === selectedCompany)
      const now = new Date()

      const activeFrom = scheduleType === "now"
        ? now.toISOString()
        : new Date(scheduledDateTime).toISOString()

      const activeFromDate = new Date(activeFrom)
      const activeUntilDate = new Date(activeFromDate)
      activeUntilDate.setDate(activeUntilDate.getDate() + parseInt(activeDays))

      // If sending now, expire any currently active release
      if (scheduleType === "now" && activeRelease) {
        await updateDocument(COLLECTIONS.SCHEDULES, activeRelease.id, {
          status: "expired",
        })
      }

      await createDocument(COLLECTIONS.SCHEDULES, {
        templateId: selectedTemplate,
        templateName: template?.name ?? "",
        organizationId: selectedCompany,
        organizationName: org?.name ?? "",
        department: selectedDepartment || "all",
        scheduleType,
        scheduledAt: activeFrom,
        activeFrom,
        activeUntil: activeUntilDate.toISOString(),
        recurringFrequency: scheduleType === "recurring" ? recurringFrequency : null,
        recipientCount: 0, // Will be computed when actually sent
        responseCount: 0,
        status: scheduleType === "now" ? "active" : "scheduled",
        createdBy: user?.id ?? "",
      })

      setSentType(scheduleType)
      setSent(true)
      await fetchData()

      // Reset form
      setSelectedTemplate("")
      setSelectedCompany("")
      setSelectedDepartment("")
      setScheduleType("now")
      setScheduledDateTime("")
      setRecurringFrequency("weekly")
      setActiveDays("7")
    } catch (err) {
      console.error("Failed to schedule release:", err)
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteScheduled(releaseId: string) {
    try {
      await deleteDocument(COLLECTIONS.SCHEDULES, releaseId)
      await fetchData()
    } catch (err) {
      console.error("Failed to delete scheduled release:", err)
    }
  }

  async function handlePauseActive() {
    if (!activeRelease) return
    try {
      await updateDocument(COLLECTIONS.SCHEDULES, activeRelease.id, {
        status: "paused",
      })
      await fetchData()
    } catch (err) {
      console.error("Failed to pause release:", err)
    }
  }

  async function handleResumeRelease(releaseId: string) {
    try {
      // Expire any currently active release first
      if (activeRelease) {
        await updateDocument(COLLECTIONS.SCHEDULES, activeRelease.id, {
          status: "expired",
        })
      }
      await updateDocument(COLLECTIONS.SCHEDULES, releaseId, {
        status: "active",
      })
      await fetchData()
    } catch (err) {
      console.error("Failed to resume release:", err)
    }
  }

  function formatDate(iso: string) {
    if (!iso) return "--"
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  function timeUntil(iso: string) {
    const diff = new Date(iso).getTime() - Date.now()
    if (diff <= 0) return "Now"
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days}d ${hours}h`
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${mins}m`
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Schedule Scorecard Release
        </h1>
        <p className="mt-1 text-muted-foreground">
          Select a template, choose recipients, and send or schedule your scorecard
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Select Template */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Select Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a scorecard template..." />
                </SelectTrigger>
                <SelectContent>
                  {publishedTemplates.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No published templates available. Publish a template first.
                    </div>
                  )}
                  {publishedTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.questionCount} questions)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedTemplate && (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  You must select a published template before sending
                </p>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Delivery Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label>Company</Label>
                  <Select
                    value={selectedCompany}
                    onValueChange={(val) => {
                      setSelectedCompany(val)
                      setSelectedDepartment("")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company..." />
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
                <div className="flex flex-col gap-2">
                  <Label>Department</Label>
                  <Select
                    value={selectedDepartment}
                    onValueChange={setSelectedDepartment}
                    disabled={!selectedCompany}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCompany ? "All Departments" : "Select company first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {activeOrg?.departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Schedule Type</Label>
                  <Select value={scheduleType} onValueChange={setScheduleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Send Now</SelectItem>
                      <SelectItem value="scheduled">Schedule</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {scheduleType !== "now" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Date & Time</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="datetime-local"
                        value={scheduledDateTime}
                        onChange={(e) => setScheduledDateTime(e.target.value)}
                      />
                    </div>
                  </div>
                  {scheduleType === "recurring" && (
                    <div className="flex flex-col gap-2">
                      <Label>Frequency</Label>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Active Window */}
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Active Window</Label>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  How long should this scorecard be available for users to complete?
                  Only one scorecard can be active at a time. Publishing a new release will expire the previous one.
                </p>
                <Select value={activeDays} onValueChange={setActiveDays}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="5">5 days</SelectItem>
                    <SelectItem value="7">7 days (1 week)</SelectItem>
                    <SelectItem value="14">14 days (2 weeks)</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!selectedCompany && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  Select a company to configure delivery
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Recipients
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
                <Checkbox
                  id="all-users-group"
                  checked={allUsersInGroup}
                  onCheckedChange={(checked) => {
                    setAllUsersInGroup(!!checked)
                  }}
                />
                <Label htmlFor="all-users-group" className="flex flex-col cursor-pointer">
                  <span className="text-sm font-medium text-foreground">
                    All Users in Group
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedCompany
                      ? selectedDepartment && selectedDepartment !== "all"
                        ? `Send to all users in ${activeOrg?.name ?? "company"} - ${selectedDepartment} department`
                        : `Send to all users in ${activeOrg?.name ?? "selected company"}`
                      : "Select a company above to define the group"}
                  </span>
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Send Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              disabled={!selectedTemplate || !selectedCompany || sending}
              onClick={handleSend}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {scheduleType === "now" ? "Release Scorecard Now" : "Schedule Release"}
            </Button>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Currently Active */}
          {activeRelease && (
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Currently Active</CardTitle>
                  <Badge className="bg-success/10 text-success">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-foreground">{activeRelease.templateName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeRelease.organizationName}
                  {activeRelease.department !== "all" ? ` - ${activeRelease.department}` : ""}
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs">
                  <Timer className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">
                    Expires {formatDate(activeRelease.activeUntil)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full bg-transparent text-amber-600 border-amber-300 hover:bg-amber-50"
                  onClick={handlePauseActive}
                >
                  <Pause className="mr-2 h-3.5 w-3.5" />
                  Pause Scorecard
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Scheduled Releases */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Scheduled Releases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scheduledReleases.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No upcoming releases scheduled
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {scheduledReleases.map((release) => (
                    <div
                      key={release.id}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-foreground">
                          {release.templateName}
                        </p>
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                          {timeUntil(release.scheduledAt)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {release.organizationName}
                        {release.department !== "all" ? ` - ${release.department}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Scheduled for {formatDate(release.scheduledAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Active for {Math.round((new Date(release.activeUntil).getTime() - new Date(release.activeFrom).getTime()) / (1000 * 60 * 60 * 24))} days
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteScheduled(release.id)}
                      >
                        <Trash2 className="mr-1.5 h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paused Releases */}
          {pausedReleases.length > 0 && (
            <Card className="border-amber-300/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Paused</CardTitle>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">Paused</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {pausedReleases.map((release) => (
                    <div key={release.id} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-foreground">{release.templateName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {release.organizationName}
                        {release.department !== "all" ? ` - ${release.department}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Expires {formatDate(release.activeUntil)}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 flex-1 bg-transparent text-xs"
                          onClick={() => handleResumeRelease(release.id)}
                        >
                          <Play className="mr-1.5 h-3 w-3" />
                          Resume
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteScheduled(release.id)}
                        >
                          <Trash2 className="mr-1.5 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Releases (completed/expired only) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Recent Releases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedReleases.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No completed releases yet
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {completedReleases.map((release) => (
                    <div
                      key={release.id}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-foreground">
                          {release.templateName}
                        </p>
                        <Badge
                          variant="secondary"
                          className={
                            release.status === "completed"
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {release.status === "completed" ? "Complete" : "Expired"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(release.scheduledAt)}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{release.recipientCount} recipients</span>
                        <span>{release.responseCount} responses</span>
                        {release.recipientCount > 0 && (
                          <span className="font-medium text-foreground">
                            {Math.round((release.responseCount / release.recipientCount) * 100)}% rate
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Scorecards sent this month", value: "0" },
                  { label: "Average response rate", value: "0%" },
                  { label: "Total responses collected", value: "0" },
                  { label: "Active recipients", value: "0" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-muted-foreground">
                      {stat.label}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success confirmation modal */}
      <Dialog open={sent} onOpenChange={setSent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-7 w-7 text-success" />
            </div>
            <DialogTitle className="text-lg">
              {sentType === "now" ? "Scorecard Released" : "Scorecard Scheduled"}
            </DialogTitle>
            <DialogDescription>
              {sentType === "now"
                ? "Your scorecard is now active and available to recipients."
                : "Your scorecard has been scheduled and will be released at the specified time."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-2">
            <Button onClick={() => setSent(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
