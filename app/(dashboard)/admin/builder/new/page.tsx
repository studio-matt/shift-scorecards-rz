"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  Save,
  ArrowLeft,
  TrendingUp,
} from "lucide-react"
import { mockWeeklyTrends } from "@/lib/mock-data"

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

export default function NewScorecardBuilderPage() {
  const router = useRouter()
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
  const [newQuestionText, setNewQuestionText] = useState("")
  const [newQuestionType, setNewQuestionType] = useState<"scale" | "number" | "text">("scale")

  function addQuestion() {
    if (!newQuestionText.trim()) return
    setQuestions((prev) => [
      ...prev,
      {
        id: `bq-${Date.now()}`,
        text: newQuestionText,
        type: newQuestionType,
      },
    ])
    setNewQuestionText("")
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  function updateQuestionType(id: string, type: "scale" | "number" | "text") {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, type } : q)),
    )
  }

  const typeLabel: Record<string, string> = {
    scale: "Scale: 1-10",
    number: "Number",
    text: "Text",
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/builder")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Templates
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Scorecard Builder
        </h1>
        <p className="mt-1 text-muted-foreground">
          Build and configure your scorecard template
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left column: Builder */}
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Template Details
              </CardTitle>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                New Scorecard
              </Button>
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

              {/* Questions */}
              <div>
                <div className="mb-3">
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
                      <Select
                        value={q.type}
                        onValueChange={(val) =>
                          updateQuestionType(q.id, val as "scale" | "number" | "text")
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scale">Scale: 1-10</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                        </SelectContent>
                      </Select>
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
                    className="flex-1"
                  />
                  <Select
                    value={newQuestionType}
                    onValueChange={(val) =>
                      setNewQuestionType(val as "scale" | "number" | "text")
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scale">Scale: 1-10</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={addQuestion}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add
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
              <div className="flex gap-3">
                <Button variant="outline" size="sm">
                  Edit Session Builder Prompt
                </Button>
                <Button variant="outline" size="sm">
                  Copy UX Pilot Prompt
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.push("/admin/builder")}>
              Cancel
            </Button>
            <Button onClick={() => router.push("/admin/builder")}>
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
          </div>
        </div>

        {/* Right column: Analytics */}
        <div className="flex flex-col gap-6">
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
        </div>
      </div>
    </div>
  )
}
