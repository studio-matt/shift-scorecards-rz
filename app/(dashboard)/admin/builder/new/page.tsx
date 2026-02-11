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
          {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Scorecard"}
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
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Publish Scorecard"}
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
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">0</p>
                  <p className="text-xs text-muted-foreground">Total Responses</p>
                  <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />--
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">--</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                  <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />--
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">--</p>
                  <p className="text-xs text-muted-foreground">Response Rate</p>
                  <p className="text-xs text-muted-foreground">--</p>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
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
