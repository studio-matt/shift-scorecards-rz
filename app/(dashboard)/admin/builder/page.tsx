"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  MoreVertical,
  FileText,
  Edit,
  Copy,
  Trash2,
  Loader2,
  Save,
  Info,
  Target,
} from "lucide-react"
import {
  getDocuments,
  getDocument,
  createDocument,
  setDocument,
  deleteDocument,
  COLLECTIONS,
} from "@/lib/firestore"
import { orderBy } from "firebase/firestore"

interface Template {
  id: string
  name: string
  description: string
  questions: unknown[]
  questionCount: number
  status: "active" | "draft" | "archived"
  updatedAt?: unknown
  createdAt?: unknown
}

interface InsightRule {
  id: string
  min: number
  max: number
  message: string
}

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning",
  archived: "bg-muted text-muted-foreground",
}

function formatDate(val: unknown): string {
  if (!val) return "-"
  if (typeof val === "string") return val
  if (typeof val === "object" && val !== null && "seconds" in val) {
    return new Date((val as { seconds: number }).seconds * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
  return "-"
}

export default function TemplatesPage() {
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [globalScoreRules, setGlobalScoreRules] = useState<InsightRule[]>([
    { id: "gsr-1", min: 0, max: 5.9, message: "Every submission builds your baseline. Focus on small, consistent improvements each week." },
    { id: "gsr-2", min: 6, max: 7.9, message: "Solid scores across the board. Look for one area to push from good to great next week." },
    { id: "gsr-3", min: 8, max: 10, message: "Consistently high performance. You're setting the standard for your team." },
  ])
  const [globalPercentileRules, setGlobalPercentileRules] = useState<InsightRule[]>([
    { id: "gpr-1", min: 75, max: 100, message: "You're in the top performers of your organization. Keep leading by example." },
    { id: "gpr-2", min: 50, max: 74, message: "You're scoring above your department average. Keep pushing higher." },
    { id: "gpr-3", min: 0, max: 49, message: "Focus on identifying one area to improve each week to climb the rankings." },
  ])

  // Dashboard targets
  const [savingTargets, setSavingTargets] = useState(false)
  const [targets, setTargets] = useState({
    avgScore: 7.0,
    completionRate: 85,
    activeUsers: 100,
    scorecardsSent: 50,
    fieldAverage: 6.2,
  })

  // Variance & correlation feedback settings
  const [savingFeedback, setSavingFeedback] = useState(false)
  const [varianceFeedback, setVarianceFeedback] = useState({
    highVarianceThreshold: 1.5,
    lowVarianceThreshold: 0.5,
    highVarianceMessage: "{dept} has the widest performance spread. {high} high performer(s), {low} need support.",
    lowVarianceMessage: "{dept}: moderate spread with {high} strong and {low} needing attention.",
    balancedMessage: "{dept} is tightly aligned -- scores are consistent across the team.",
  })
  const [correlationFeedback, setCorrelationFeedback] = useState({
    strongPositive: 'Strong link: Teams that score high on one also score high on the other. Investing in one lifts both.',
    moderatePositive: 'Moderate link between these areas. Consider coaching strategies that address both together.',
    strongNegative: 'Inverse relationship: as one improves, the other tends to drop. Investigate potential trade-offs.',
  })

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      // Load global insight settings
      const [globalDoc, targetsDoc, feedbackDoc] = await Promise.all([
        getDocument(COLLECTIONS.SETTINGS, "globalInsights"),
        getDocument(COLLECTIONS.SETTINGS, "dashboardTargets"),
        getDocument(COLLECTIONS.SETTINGS, "analyticsFeedback"),
      ])
      if (globalDoc) {
        const g = globalDoc as Record<string, unknown>
        if (g.scoreRules) setGlobalScoreRules(g.scoreRules as InsightRule[])
        if (g.percentileRules) setGlobalPercentileRules(g.percentileRules as InsightRule[])
      }
      if (targetsDoc) {
        const t = targetsDoc as Record<string, unknown>
        setTargets((prev) => ({
          avgScore: (t.avgScore as number) ?? prev.avgScore,
          completionRate: (t.completionRate as number) ?? prev.completionRate,
          activeUsers: (t.activeUsers as number) ?? prev.activeUsers,
          scorecardsSent: (t.scorecardsSent as number) ?? prev.scorecardsSent,
          fieldAverage: (t.fieldAverage as number) ?? prev.fieldAverage,
        }))
      }
      if (feedbackDoc) {
        const f = feedbackDoc as Record<string, unknown>
        if (f.varianceFeedback) setVarianceFeedback(f.varianceFeedback as typeof varianceFeedback)
        if (f.correlationFeedback) setCorrelationFeedback(f.correlationFeedback as typeof correlationFeedback)
      }
      const docs = await getDocuments(COLLECTIONS.TEMPLATES, orderBy("name"))
      setItems(
        docs.map((d) => ({
          id: d.id,
          name: (d as Record<string, unknown>).name as string ?? "",
          description: (d as Record<string, unknown>).description as string ?? "",
          questions: ((d as Record<string, unknown>).questions as unknown[]) ?? [],
          questionCount: ((d as Record<string, unknown>).questionCount as number) ?? ((d as Record<string, unknown>).questions as unknown[])?.length ?? 0,
          status: ((d as Record<string, unknown>).status as "active" | "draft" | "archived") ?? "draft",
          updatedAt: (d as Record<string, unknown>).updatedAt,
          createdAt: (d as Record<string, unknown>).createdAt,
        })),
      )
    } catch (err) {
      console.error("Failed to fetch templates:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const filtered = items.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleSaveGlobal() {
    setSavingGlobal(true)
    try {
      await setDocument(COLLECTIONS.SETTINGS, "globalInsights", {
        scoreRules: globalScoreRules,
        percentileRules: globalPercentileRules,
      })
    } catch (err) {
      console.error("Failed to save global insights:", err)
    } finally {
      setSavingGlobal(false)
    }
  }

  async function handleSaveFeedback() {
    setSavingFeedback(true)
    try {
      await setDocument(COLLECTIONS.SETTINGS, "analyticsFeedback", {
        varianceFeedback,
        correlationFeedback,
      })
    } catch (err) {
      console.error("Failed to save feedback settings:", err)
    } finally {
      setSavingFeedback(false)
    }
  }

  async function handleSaveTargets() {
    setSavingTargets(true)
    try {
      await setDocument(COLLECTIONS.SETTINGS, "dashboardTargets", targets)
    } catch (err) {
      console.error("Failed to save targets:", err)
    } finally {
      setSavingTargets(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocument(COLLECTIONS.TEMPLATES, id)
      await fetchTemplates()
    } catch (err) {
      console.error("Failed to delete template:", err)
    }
  }

  async function handleDuplicate(tmpl: Template) {
    try {
      await createDocument(COLLECTIONS.TEMPLATES, {
        name: `${tmpl.name} (Copy)`,
        description: tmpl.description,
        questions: tmpl.questions,
        questionCount: tmpl.questionCount,
        status: "draft",
      })
      await fetchTemplates()
    } catch (err) {
      console.error("Failed to duplicate template:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Scorecard Builder
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage scorecard templates for your organization
          </p>
        </div>
        <Link href="/admin/builder/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New Scorecard
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Template list */}
      <div className="flex flex-col gap-3">
        {filtered.map((tmpl) => (
          <Card key={tmpl.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/builder/new?template=${tmpl.id}`}
                    className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                  >
                    {tmpl.name}
                  </Link>
                  <Badge
                    variant="secondary"
                    className={`text-xs capitalize ${statusColors[tmpl.status]}`}
                  >
                    {tmpl.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {tmpl.description}
                </p>
                <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{tmpl.questionCount} questions</span>
                  <span>Modified {formatDate(tmpl.updatedAt)}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href={`/admin/builder/new?template=${tmpl.id}`}>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem onClick={() => handleDuplicate(tmpl)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDelete(tmpl.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                No templates found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different search or create a new template
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Global Success & Progress Messages ── */}
      <div className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Global Success & Progress Messages
            </h2>
            <div className="mt-1 flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                These messages apply to all templates by default. Individual templates can override them by unchecking "Use Universal Success & Progress Messages" in their settings.
              </p>
            </div>
          </div>
          <Button onClick={handleSaveGlobal} disabled={savingGlobal}>
            <Save className="mr-2 h-4 w-4" />
            {savingGlobal ? "Saving..." : "Save Global Messages"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Score-Based */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Score-Based Progress Markers
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Messages shown based on average score (1-10 scale).
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {globalScoreRules.map((rule) => (
                <div key={rule.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Label className="w-8 text-xs text-muted-foreground">Min</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={rule.min}
                        onChange={(e) =>
                          setGlobalScoreRules((prev) =>
                            prev.map((r) => (r.id === rule.id ? { ...r, min: parseFloat(e.target.value) || 0 } : r))
                          )
                        }
                        className="w-20 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="w-8 text-xs text-muted-foreground">Max</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={rule.max}
                        onChange={(e) =>
                          setGlobalScoreRules((prev) =>
                            prev.map((r) => (r.id === rule.id ? { ...r, max: parseFloat(e.target.value) || 0 } : r))
                          )
                        }
                        className="w-20 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setGlobalScoreRules((prev) => prev.filter((r) => r.id !== rule.id))}
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      aria-label="Remove rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Textarea
                    value={rule.message}
                    onChange={(e) =>
                      setGlobalScoreRules((prev) =>
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
                  setGlobalScoreRules((prev) => [
                    ...prev,
                    { id: `gsr-${Date.now()}`, min: 0, max: 10, message: "" },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Score Rule
              </Button>
            </CardContent>
          </Card>

          {/* Percentile-Based */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Percentile-Based Progress Markers
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Messages shown based on percentile rank (0-100%).
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {globalPercentileRules.map((rule) => (
                <div key={rule.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Label className="w-8 text-xs text-muted-foreground">Min</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={rule.min}
                        onChange={(e) =>
                          setGlobalPercentileRules((prev) =>
                            prev.map((r) => (r.id === rule.id ? { ...r, min: parseInt(e.target.value) || 0 } : r))
                          )
                        }
                        className="w-20 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="w-8 text-xs text-muted-foreground">Max</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={rule.max}
                        onChange={(e) =>
                          setGlobalPercentileRules((prev) =>
                            prev.map((r) => (r.id === rule.id ? { ...r, max: parseInt(e.target.value) || 0 } : r))
                          )
                        }
                        className="w-20 text-sm"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">%</span>
                    <button
                      type="button"
                      onClick={() => setGlobalPercentileRules((prev) => prev.filter((r) => r.id !== rule.id))}
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      aria-label="Remove rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Textarea
                    value={rule.message}
                    onChange={(e) =>
                      setGlobalPercentileRules((prev) =>
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
                  setGlobalPercentileRules((prev) => [
                    ...prev,
                    { id: `gpr-${Date.now()}`, min: 0, max: 100, message: "" },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Percentile Rule
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* ── Analytics Feedback Templates ── */}
      <div className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Analytics Feedback Templates
            </h2>
            <div className="mt-1 flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Configure the contextual feedback messages shown in the Trend & Sentiment section. Use placeholders: {"{dept}"}, {"{high}"}, {"{low}"}, {"{stdDev}"}, {"{total}"}.
              </p>
            </div>
          </div>
          <Button onClick={handleSaveFeedback} disabled={savingFeedback}>
            <Save className="mr-2 h-4 w-4" />
            {savingFeedback ? "Saving..." : "Save Feedback"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Department Variance Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Department Variance Feedback</CardTitle>
              <p className="text-xs text-muted-foreground">Messages shown below the variance chart for each department</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">High Variance Threshold</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={varianceFeedback.highVarianceThreshold}
                    onChange={(e) => setVarianceFeedback((p) => ({ ...p, highVarianceThreshold: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Low Variance Threshold</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={varianceFeedback.lowVarianceThreshold}
                    onChange={(e) => setVarianceFeedback((p) => ({ ...p, lowVarianceThreshold: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">High Variance Message</Label>
                <Textarea
                  value={varianceFeedback.highVarianceMessage}
                  onChange={(e) => setVarianceFeedback((p) => ({ ...p, highVarianceMessage: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Moderate Variance Message</Label>
                <Textarea
                  value={varianceFeedback.lowVarianceMessage}
                  onChange={(e) => setVarianceFeedback((p) => ({ ...p, lowVarianceMessage: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Low Variance (Balanced) Message</Label>
                <Textarea
                  value={varianceFeedback.balancedMessage}
                  onChange={(e) => setVarianceFeedback((p) => ({ ...p, balancedMessage: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Correlation Insight Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Correlation Insight Feedback</CardTitle>
              <p className="text-xs text-muted-foreground">Coaching insights auto-generated from question correlation strength</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Strong Positive Correlation (0.7+)</Label>
                <Textarea
                  value={correlationFeedback.strongPositive}
                  onChange={(e) => setCorrelationFeedback((p) => ({ ...p, strongPositive: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Moderate Positive Correlation (0.5-0.7)</Label>
                <Textarea
                  value={correlationFeedback.moderatePositive}
                  onChange={(e) => setCorrelationFeedback((p) => ({ ...p, moderatePositive: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Strong Negative Correlation (-0.5 or lower)</Label>
                <Textarea
                  value={correlationFeedback.strongNegative}
                  onChange={(e) => setCorrelationFeedback((p) => ({ ...p, strongNegative: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Dashboard Targets ── */}
      <div className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Dashboard Targets
            </h2>
            <div className="mt-1 flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Set performance targets for the admin dashboard KPI cards and chart reference lines. Actual vs. target is calculated automatically.
              </p>
            </div>
          </div>
          <Button onClick={handleSaveTargets} disabled={savingTargets}>
            <Save className="mr-2 h-4 w-4" />
            {savingTargets ? "Saving..." : "Save Targets"}
          </Button>
        </div>

        <Card>
          <CardContent className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Avg Score Target */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Avg Score Target</Label>
              <p className="text-xs text-muted-foreground">Target for the average score KPI card and trend chart reference line (1-10 scale)</p>
              <Input
                type="number"
                min={1}
                max={10}
                step={0.1}
                value={targets.avgScore}
                onChange={(e) => setTargets((p) => ({ ...p, avgScore: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            {/* Completion Rate Target */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Completion Rate Target</Label>
              <p className="text-xs text-muted-foreground">Target percentage for scorecard completion rate (0-100%)</p>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={targets.completionRate}
                  onChange={(e) => setTargets((p) => ({ ...p, completionRate: parseInt(e.target.value) || 0 }))}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            {/* Active Users Target */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Active Users Target</Label>
              <p className="text-xs text-muted-foreground">Target number of active users per period</p>
              <Input
                type="number"
                min={0}
                value={targets.activeUsers}
                onChange={(e) => setTargets((p) => ({ ...p, activeUsers: parseInt(e.target.value) || 0 }))}
              />
            </div>

            {/* Scorecards Sent Target */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Scorecards Sent Target</Label>
              <p className="text-xs text-muted-foreground">Target number of scorecards sent per period</p>
              <Input
                type="number"
                min={0}
                value={targets.scorecardsSent}
                onChange={(e) => setTargets((p) => ({ ...p, scorecardsSent: parseInt(e.target.value) || 0 }))}
              />
            </div>

            {/* Field Average */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Field Average Benchmark</Label>
              <p className="text-xs text-muted-foreground">Anonymized industry benchmark line shown on all charts (1-10 scale)</p>
              <Input
                type="number"
                min={1}
                max={10}
                step={0.1}
                value={targets.fieldAverage}
                onChange={(e) => setTargets((p) => ({ ...p, fieldAverage: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
