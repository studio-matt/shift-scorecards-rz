"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  Loader2,
  FileDown,
} from "lucide-react"
import {
  getDocument,
  createDocument,
  updateDocument,
  COLLECTIONS,
} from "@/lib/firestore"

// ---------- Types ----------

interface BuilderQuestion {
  id: string
  text: string
  type: "scale" | "number" | "text"
}

interface ScoreInsightRule {
  id: string
  min: number
  max: number
  message: string
}

interface PercentileInsightRule {
  id: string
  min: number
  max: number
  message: string
}

// ---------- Static chart data (placeholder until real responses exist) ----------

const trendPlaceholder = [
  { week: "W1", score: 0 },
  { week: "W2", score: 0 },
  { week: "W3", score: 0 },
  { week: "W4", score: 0 },
  { week: "W5", score: 0 },
  { week: "W6", score: 0 },
  { week: "W7", score: 0 },
]

const distributionPlaceholder = [
  { week: "W1", score: 0 },
  { week: "W2", score: 0 },
  { week: "W3", score: 0 },
  { week: "W4", score: 0 },
  { week: "W5", score: 0 },
  { week: "W6", score: 0 },
  { week: "W7", score: 0 },
]

// ---------- Page ----------

export default function NewScorecardBuilderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get("template")
  const isEditing = !!templateId

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)

  const [scorecardName, setScorecardName] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<"active" | "draft">("draft")
  const [questions, setQuestions] = useState<BuilderQuestion[]>([])
  const [newQuestionText, setNewQuestionText] = useState("")
  const [newQuestionType, setNewQuestionType] = useState<"scale" | "number" | "text">("scale")

  // Insight rules
  const [scoreInsightRules, setScoreInsightRules] = useState<ScoreInsightRule[]>([
    { id: "sr-1", min: 0, max: 5.9, message: "Every submission builds your baseline. Focus on small, consistent improvements each week." },
    { id: "sr-2", min: 6, max: 7.9, message: "Solid scores across the board. Look for one area to push from good to great next week." },
    { id: "sr-3", min: 8, max: 10, message: "Consistently high performance. You're setting the standard for your team." },
  ])
  const [percentileInsightRules, setPercentileInsightRules] = useState<PercentileInsightRule[]>([
    { id: "pr-1", min: 75, max: 100, message: "You're in the top performers of your organization. Keep leading by example." },
    { id: "pr-2", min: 50, max: 74, message: "You're scoring above your department average. Keep pushing higher." },
    { id: "pr-3", min: 0, max: 49, message: "Focus on identifying one area to improve each week to climb the rankings." },
  ])

  // ---------- Load existing template ----------

  const loadTemplate = useCallback(async () => {
    if (!templateId) return
    try {
      setLoading(true)
      const doc = await getDocument(COLLECTIONS.TEMPLATES, templateId)
      if (doc) {
        const d = doc as Record<string, unknown>
        setScorecardName((d.name as string) ?? "")
        setDescription((d.description as string) ?? "")
        setStatus((d.status as "active" | "draft") ?? "draft")
        const rawQ = (d.questions as BuilderQuestion[]) ?? []
        setQuestions(
          rawQ.map((q, i) => ({
            id: q.id || `bq-${i}`,
            text: q.text ?? "",
            type: q.type ?? "scale",
          })),
        )
        if (d.scoreInsightRules) setScoreInsightRules(d.scoreInsightRules as ScoreInsightRule[])
        if (d.percentileInsightRules) setPercentileInsightRules(d.percentileInsightRules as PercentileInsightRule[])
      }
    } catch (err) {
      console.error("Failed to load template:", err)
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    loadTemplate()
  }, [loadTemplate])

  // ---------- Question helpers ----------

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

  function updateQuestionText(id: string, text: string) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, text } : q)))
  }

  function updateQuestionType(id: string, type: "scale" | "number" | "text") {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, type } : q)))
  }

  // ---------- Save helpers ----------

  async function saveTemplate(saveStatus: "active" | "draft") {
    if (!scorecardName.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: scorecardName.trim(),
        description: description.trim(),
        questions,
        questionCount: questions.length,
        status: saveStatus,
        scoreInsightRules,
        percentileInsightRules,
      }
      if (isEditing && templateId) {
        await updateDocument(COLLECTIONS.TEMPLATES, templateId, payload)
      } else {
        await createDocument(COLLECTIONS.TEMPLATES, payload)
      }
      router.push("/admin/builder")
    } catch (err) {
      console.error("Failed to save template:", err)
    } finally {
      setSaving(false)
    }
  }

  // ---------- Loading ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ---------- Render ----------

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/builder")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEditing ? "Edit Scorecard" : "New Scorecard"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isEditing
                ? "Edit your scorecard template and questions"
                : "Build a new scorecard template"}
            </p>
          </div>
        </div>
        <Button onClick={() => saveTemplate("active")} disabled={saving || !scorecardName.trim()}>
          <Save className="mr-2 h-4 w-4" />
          {saving
            ? "Saving..."
            : status === "draft"
              ? "Publish Scorecard"
              : isEditing
                ? "Save Changes"
                : "Publish Scorecard"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left column: Builder */}
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Template Details
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sc-name">Scorecard Name</Label>
                <Input
                  id="sc-name"
                  placeholder="e.g. Weekly Performance Review"
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
                  <Label>Questions ({questions.length})</Label>
                </div>
                <div className="flex flex-col gap-2">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                      <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                        {idx + 1}.
                      </span>
                      <Input
                        value={q.text}
                        onChange={(e) => updateQuestionText(q.id, e.target.value)}
                        className="flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                      />
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

                  {questions.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No questions yet. Add your first question below.
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Add a new question..."
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addQuestion()
                      }
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

          {/* ── Score-Based Progress Markers ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Score-Based Progress Markers
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Define messages shown to users based on their average score (1-10 scale). Each rule needs a min/max range and a message.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {scoreInsightRules.map((rule) => (
                <div key={rule.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground w-8">Min</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={rule.min}
                        onChange={(e) =>
                          setScoreInsightRules((prev) =>
                            prev.map((r) => (r.id === rule.id ? { ...r, min: parseFloat(e.target.value) || 0 } : r))
                          )
                        }
                        className="w-20 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground w-8">Max</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={rule.max}
                        onChange={(e) =>
                          setScoreInsightRules((prev) =>
                            prev.map((r) => (r.id === rule.id ? { ...r, max: parseFloat(e.target.value) || 0 } : r))
                          )
                        }
                        className="w-20 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setScoreInsightRules((prev) => prev.filter((r) => r.id !== rule.id))
                      }
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      aria-label="Remove rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Textarea
                    value={rule.message}
                    onChange={(e) =>
                      setScoreInsightRules((prev) =>
                        prev.map((r) => (r.id === rule.id ? { ...r, message: e.target.value } : r))
                      )
                    }
                    placeholder="Message shown when score falls in this range..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setScoreInsightRules((prev) => [
                    ...prev,
                    { id: `sr-${Date.now()}`, min: 0, max: 10, message: "" },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Score Rule
              </Button>
            </CardContent>
          </Card>

          {/* ── Percentile-Based Progress Markers ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Percentile-Based Progress Markers
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Define messages shown to users based on their percentile rank (0-100%) within their organization.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {percentileInsightRules.map((rule) => (
                <div key={rule.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground w-8">Min</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={rule.min}
                        onChange={(e) =>
                          setPercentileInsightRules((prev) =>
                            prev.map((r) => (r.id === rule.id ? { ...r, min: parseInt(e.target.value) || 0 } : r))
                          )
                        }
                        className="w-20 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground w-8">Max</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={rule.max}
                        onChange={(e) =>
                          setPercentileInsightRules((prev) =>
                            prev.map((r) => (r.id === rule.id ? { ...r, max: parseInt(e.target.value) || 0 } : r))
                          )
                        }
                        className="w-20 text-sm"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">%</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPercentileInsightRules((prev) => prev.filter((r) => r.id !== rule.id))
                      }
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      aria-label="Remove rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Textarea
                    value={rule.message}
                    onChange={(e) =>
                      setPercentileInsightRules((prev) =>
                        prev.map((r) => (r.id === rule.id ? { ...r, message: e.target.value } : r))
                      )
                    }
                    placeholder="Message shown when percentile falls in this range..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPercentileInsightRules((prev) => [
                    ...prev,
                    { id: `pr-${Date.now()}`, min: 0, max: 100, message: "" },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Percentile Rule
              </Button>
            </CardContent>
          </Card>

          {/* Save actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.push("/admin/builder")}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => saveTemplate("draft")}
              disabled={saving || !scorecardName.trim()}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              onClick={() => saveTemplate("active")}
              disabled={saving || !scorecardName.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving
                ? "Saving..."
                : status === "draft"
                  ? "Publish Scorecard"
                  : isEditing
                    ? "Save Changes"
                    : "Publish Scorecard"}
            </Button>
          </div>
        </div>

        {/* Right column: Analytics (zeroed until real data) */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Analytics Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 pb-4">
                <div className="flex flex-col items-center gap-1 rounded-lg border border-border p-3">
                  <p className="text-2xl font-bold text-foreground">0</p>
                  <p className="text-xs text-muted-foreground">Total Responses</p>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-lg border border-border p-3">
                  <p className="text-2xl font-bold text-foreground">--</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-lg border border-border p-3">
                  <p className="text-2xl font-bold text-foreground">--</p>
                  <p className="text-xs text-muted-foreground">Response Rate</p>
                </div>
              </div>
              <p className="rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                Analytics will populate after the first scorecard response
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Score Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendPlaceholder}>
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
                Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionPlaceholder} barSize={28}>
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
