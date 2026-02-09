"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Plus,
  GripVertical,
  Trash2,
  Send,
  Calendar,
  ChevronRight,
  TrendingUp,
  Users,
  BarChart3,
  FileText,
} from "lucide-react"
import {
  mockSavedTemplates,
  mockAllUsers,
  mockWeeklyTrends,
} from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface BuilderQuestion {
  id: string
  text: string
  type: "scale" | "number" | "text"
}

const distributionData = [
  { week: "Week 1", score: 6.5 },
  { week: "Week 2", score: 7.0 },
  { week: "Week 3", score: 7.2 },
  { week: "Week 4", score: 7.8 },
  { week: "Week 5", score: 7.5 },
  { week: "Week 6", score: 8.0 },
  { week: "Week 7", score: 8.2 },
]

export default function AdminBuilderPage() {
  const [questions, setQuestions] = useState<BuilderQuestion[]>([
    {
      id: "bq1",
      text: "How satisfied are you with team collaboration?",
      type: "scale",
    },
    {
      id: "bq2",
      text: "Rate your productivity this week",
      type: "scale",
    },
    {
      id: "bq3",
      text: "How clear are your project goals?",
      type: "scale",
    },
  ])
  const [scorecardName, setScorecardName] = useState("Weekly Performance Review")
  const [description, setDescription] = useState("")
  const [customLogic, setCustomLogic] = useState("")
  const [scheduleType, setScheduleType] = useState("now")
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    mockAllUsers.filter((u) => u.selected).map((u) => u.id),
  )
  const [newQuestionText, setNewQuestionText] = useState("")

  function addQuestion() {
    if (!newQuestionText.trim()) return
    setQuestions((prev) => [
      ...prev,
      {
        id: `bq-${Date.now()}`,
        text: newQuestionText,
        type: "scale",
      },
    ])
    setNewQuestionText("")
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  function toggleUser(userId: string) {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Create, manage, and send scorecards to users
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left column: Builder */}
        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* Scorecard Builder */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Scorecard Builder
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Load Template
                </Button>
                <Button size="sm">
                  <Plus className="mr-1 h-3 w-3" />
                  New Scorecard
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sc-name">Scorecard Name</Label>
                <Input
                  id="sc-name"
                  value={scorecardName}
                  onChange={(e) => setScorecardName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sc-desc">Description</Label>
                <Textarea
                  id="sc-desc"
                  placeholder="Brief description of this scorecard..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sc-logic">Custom Logic</Label>
                <Textarea
                  id="sc-logic"
                  placeholder="Define custom logic rules for this scorecard..."
                  value={customLogic}
                  onChange={(e) => setCustomLogic(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Questions */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <Label>Questions</Label>
                </div>
                <div className="flex flex-col gap-2">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                      <p className="flex-1 text-sm text-foreground">
                        {q.text}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        Scale: 1-10
                      </Badge>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove question: ${q.text}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Add a new question..."
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addQuestion()
                    }}
                  />
                  <Button variant="outline" onClick={addQuestion}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add Question
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Build Session */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Build Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <Button variant="outline" size="sm">
                    Edit Session Builder Prompt
                  </Button>
                  <Button variant="outline" size="sm">
                    Copy UX Pilot Prompt
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Send & Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Send & Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Send To</Label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="department">By Department</SelectItem>
                      <SelectItem value="custom">Custom Selection</SelectItem>
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

              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  {scheduleType === "now" && "Immediately send to recipients"}
                  {scheduleType === "scheduled" && "Set a specific date and time"}
                  {scheduleType === "recurring" && "Send on a regular schedule"}
                </p>
              </div>

              {scheduleType !== "now" && (
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
              )}

              {/* Recipients list */}
              <div className="flex flex-col gap-2">
                <Label>Recipients</Label>
                <div className="rounded-lg border border-border">
                  <div className="border-b border-border px-3 py-2">
                    <Input
                      placeholder="Search users..."
                      className="border-0 p-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {mockAllUsers.map((user) => (
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
                    {selectedUsers.length} of {mockAllUsers.length} users
                    selected
                  </div>
                </div>
              </div>

              <Button className="w-full">
                <Send className="mr-2 h-4 w-4" />
                Send Scorecard
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Analytics & Templates */}
        <div className="flex flex-col gap-6">
          {/* Analytics Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Analytics Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">1,247</p>
                  <p className="text-xs text-muted-foreground">Total Responses</p>
                  <p className="text-xs text-success flex items-center justify-center gap-1">
                    <TrendingUp className="h-3 w-3" />12%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">7.8</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                  <p className="text-xs text-success flex items-center justify-center gap-1">
                    <TrendingUp className="h-3 w-3" />0.3
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">89%</p>
                  <p className="text-xs text-muted-foreground">Response Rate</p>
                  <p className="text-xs text-destructive">-3%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Collaboration Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Team Collaboration Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockWeeklyTrends.slice(-7)}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 10 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      domain={[6, 10]}
                      tick={{ fontSize: 10 }}
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Productivity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Productivity Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData} barSize={28}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 10 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fontSize: 10 }}
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar
                      dataKey="score"
                      fill="hsl(var(--chart-2))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Saved Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Saved Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {mockSavedTemplates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {tmpl.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tmpl.questions} questions
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
