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
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { mockAllUsers } from "@/lib/mock-data"
import {
  getOrganizations,
  getDocuments,
  COLLECTIONS,
} from "@/lib/firestore"
import { orderBy } from "firebase/firestore"
import type { Organization } from "@/lib/types"

const pastReleases = [
  {
    id: "r1",
    template: "AI Productivity Scorecard",
    sentAt: "Jan 20, 2025 at 9:00 AM",
    recipients: 42,
    responses: 38,
    status: "completed" as const,
  },
  {
    id: "r2",
    template: "AI Productivity Scorecard",
    sentAt: "Jan 13, 2025 at 9:00 AM",
    recipients: 42,
    responses: 40,
    status: "completed" as const,
  },
  {
    id: "r3",
    template: "Weekly Check-in",
    sentAt: "Jan 27, 2025 at 9:00 AM",
    recipients: 42,
    responses: 15,
    status: "in-progress" as const,
  },
]

interface TemplateOption {
  id: string
  name: string
  questionCount: number
}

export default function ScheduleReleasePage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      setDataLoading(true)
      const [orgDocs, tmplDocs] = await Promise.all([
        getOrganizations(),
        getDocuments(COLLECTIONS.TEMPLATES, orderBy("name")),
      ])
      setOrgs(
        orgDocs.map((o) => ({
          id: o.id,
          name: (o as Record<string, unknown>).name as string ?? "",
          departments: ((o as Record<string, unknown>).departments as string[]) ?? [],
          createdAt: "",
          memberCount: ((o as Record<string, unknown>).memberCount as number) ?? 0,
        })) as Organization[],
      )
      setTemplates(
        tmplDocs.map((d) => ({
          id: d.id,
          name: (d as Record<string, unknown>).name as string ?? "",
          questionCount: ((d as Record<string, unknown>).questionCount as number) ?? ((d as Record<string, unknown>).questions as unknown[])?.length ?? 0,
        })),
      )
    } catch (err) {
      console.error("Failed to load schedule data:", err)
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [selectedCompany, setSelectedCompany] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [scheduleType, setScheduleType] = useState("now")

  const activeOrg = orgs.find((o) => o.id === selectedCompany)
  const [allUsersInGroup, setAllUsersInGroup] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    mockAllUsers.filter((u) => u.selected).map((u) => u.id),
  )
  const [userSearch, setUserSearch] = useState("")
  const [sent, setSent] = useState(false)

  function toggleUser(userId: string) {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    )
  }

  function selectAll() {
    setSelectedUsers(mockAllUsers.map((u) => u.id))
  }

  function deselectAll() {
    setSelectedUsers([])
  }

  const filteredUsers = mockAllUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.department.toLowerCase().includes(userSearch.toLowerCase()),
  )

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Scorecard Sent</h2>
        <p className="mt-2 text-muted-foreground">
          Your scorecard has been sent to {selectedUsers.length} recipients.
        </p>
        <Button className="mt-6" onClick={() => setSent(false)}>
          Schedule Another
        </Button>
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
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.questionCount} questions)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedTemplate && (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  You must select a template before sending
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

              {!selectedCompany && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  Select a company to configure delivery
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                {scheduleType === "now" && "Scorecard will be sent immediately to all selected recipients."}
                {scheduleType === "scheduled" && "Set a specific date and time to send the scorecard."}
                {scheduleType === "recurring" && "Scorecard will be sent automatically on a regular schedule."}
              </p>

              {scheduleType !== "now" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Date & Time</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="datetime-local"
                        defaultValue="2025-01-27T09:00"
                      />
                    </div>
                  </div>
                  {scheduleType === "recurring" && (
                    <div className="flex flex-col gap-2">
                      <Label>Frequency</Label>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Select defaultValue="weekly">
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
                    const val = !!checked
                    setAllUsersInGroup(val)
                    if (val) selectAll()
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

              {!allUsersInGroup && (
              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="border-0 p-0 shadow-none focus-visible:ring-0"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-xs text-muted-foreground">|</span>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.department}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  {selectedUsers.length} of {mockAllUsers.length} users selected
                </div>
              </div>
              )}
            </CardContent>
          </Card>

          {/* Send Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              disabled={!selectedTemplate || !selectedCompany}
              onClick={() => setSent(true)}
            >
              <Send className="mr-2 h-4 w-4" />
              {scheduleType === "now" ? "Send Scorecard Now" : "Schedule Scorecard"}
            </Button>
          </div>
        </div>

        {/* Right column: Past Releases */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Recent Releases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {pastReleases.map((release) => (
                  <div
                    key={release.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {release.template}
                      </p>
                      <Badge
                        variant="secondary"
                        className={
                          release.status === "completed"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        }
                      >
                        {release.status === "completed" ? "Complete" : "In Progress"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {release.sentAt}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{release.recipients} recipients</span>
                      <span>{release.responses} responses</span>
                      <span className="font-medium text-foreground">
                        {Math.round((release.responses / release.recipients) * 100)}%
                        rate
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Scorecards sent this month", value: "4" },
                  { label: "Average response rate", value: "91%" },
                  { label: "Total responses collected", value: "1,247" },
                  { label: "Active recipients", value: "42" },
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
    </div>
  )
}
