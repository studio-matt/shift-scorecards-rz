"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ChevronRight,
  Save,
  CheckCircle2,
  Loader2,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ArrowRight,
  BarChart3,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getAllReleases,
  filterActiveRelease,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocuments,
  COLLECTIONS,
} from "@/lib/firestore"
import {
  fetchAllResponses,
  computePersonalBenchmark,
  computePersonalTrend,
} from "@/lib/dashboard-data"
import { useAuth } from "@/lib/auth-context"
import type { ScorecardRelease, ScorecardQuestion } from "@/lib/types"

interface InsightRule {
  id: string
  min: number
  max: number
  message: string
}

interface TemplateData {
  id: string
  name: string
  description: string
  questions: ScorecardQuestion[]
  scoreInsightRules?: InsightRule[]
  percentileInsightRules?: InsightRule[]
}

export default function ScorecardPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [release, setRelease] = useState<ScorecardRelease | null>(null)
  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [expired, setExpired] = useState(false)
  const [noActive, setNoActive] = useState(false)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // Draft auto-save state
  const [draftId, setDraftId] = useState<string | null>(null)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Remaining time countdown
  const [remainingMs, setRemainingMs] = useState(0)

  // Load active release and its template
  useEffect(() => {
    async function load() {
      try {
        const allRel = await getAllReleases()
        const activeRel = filterActiveRelease(allRel as unknown as Record<string, unknown>[])
        // Paused releases are not shown to users -- treat as no active scorecard
        if (!activeRel) {
          setNoActive(true)
          setLoading(false)
          return
        }

        const rel = activeRel as ScorecardRelease
        const untilDate = new Date(rel.activeUntil)
        if (untilDate.getTime() < Date.now()) {
          setExpired(true)
          setRelease(rel)
          setLoading(false)
          return
        }

        setRelease(rel)
        setRemainingMs(untilDate.getTime() - Date.now())

        // Load template
        const tmpl = await getDocument(COLLECTIONS.TEMPLATES, rel.templateId)
        if (tmpl) {
          setTemplate(tmpl as unknown as TemplateData)
          
          // Check for existing response (draft or completed) for this user + release
          if (user?.id) {
            const allResponses = await getDocuments(COLLECTIONS.RESPONSES)
            
            // First check if user already COMPLETED this release
            const existingCompleted = allResponses.find((r) => {
              const data = r as Record<string, unknown>
              return (
                data.userId === user.id &&
                data.releaseId === rel.id &&
                data.status === "completed"
              )
            })
            
            if (existingCompleted) {
              // User already completed this scorecard - show "All Caught Up"
              setAlreadyCompleted(true)
              setLoading(false)
              return
            }
            
            // Check for existing draft
            const existingDraft = allResponses.find((r) => {
              const data = r as Record<string, unknown>
              return (
                data.userId === user.id &&
                data.releaseId === rel.id &&
                data.status === "draft"
              )
            })
            
            if (existingDraft) {
              const draftData = existingDraft as Record<string, unknown>
              setDraftId(existingDraft.id)
              setAnswers((draftData.answers as Record<string, string | number>) || {})
              // Find first unanswered question
              const templateData = tmpl as unknown as TemplateData
              const savedAnswers = (draftData.answers as Record<string, string | number>) || {}
              const firstUnanswered = templateData.questions?.findIndex(
                (q) => savedAnswers[q.id] === undefined
              ) ?? 0
              setCurrentQuestion(Math.max(0, firstUnanswered))
              setLastSaved(draftData.updatedAt ? new Date(draftData.updatedAt as string) : null)
            }
          }
        }
      } catch (err) {
        console.error("Failed to load scorecard:", err)
        setNoActive(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  // Countdown timer
  useEffect(() => {
    if (!release || expired || submitted) return
    const interval = setInterval(() => {
      const untilDate = new Date(release.activeUntil)
      const diff = untilDate.getTime() - Date.now()
      if (diff <= 0) {
        setExpired(true)
        setRemainingMs(0)
        clearInterval(interval)
      } else {
        setRemainingMs(diff)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [release, expired, submitted])

  const weekOfLabel = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    return monday.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }, [])

  const questions = template?.questions ?? []
  const totalQuestions = questions.length
  const completedCount = Object.keys(answers).length
  const progress = totalQuestions > 0 ? (completedCount / totalQuestions) * 100 : 0



  // Auto-save function
  const autoSaveDraft = useCallback(async (newAnswers: Record<string, string | number>) => {
    if (!release || !template || !user) return
    
    setAutoSaving(true)
    try {
      const draftData = {
        templateId: release.templateId,
        templateName: template.name,
        releaseId: release.id,
        userId: user.id,
        answers: newAnswers,
        weekOf: weekOfLabel,
        organizationId: release.organizationId,
        status: "draft" as const,
        updatedAt: new Date().toISOString(),
      }
      
      if (draftId) {
        // Update existing draft
        await updateDocument(COLLECTIONS.RESPONSES, draftId, draftData)
      } else {
        // Create new draft
        const newDoc = await createDocument(COLLECTIONS.RESPONSES, {
          ...draftData,
          createdAt: new Date().toISOString(),
        })
        if (newDoc?.id) {
          setDraftId(newDoc.id)
        }
      }
      setLastSaved(new Date())
    } catch (err) {
      console.error("Failed to auto-save draft:", err)
    } finally {
      setAutoSaving(false)
    }
  }, [release, template, user, draftId, weekOfLabel])

  const handleAnswer = useCallback(
    (questionId: string, value: string | number) => {
      const newAnswers = { ...answers, [questionId]: value }
      setAnswers(newAnswers)
      setValidationError(null)
      
      // Auto-save after each answer
      autoSaveDraft(newAnswers)
    },
    [answers, autoSaveDraft],
  )

  const handleNext = useCallback(() => {
    // Validate current question is answered
    const currentQ = questions[currentQuestion]
    if (currentQ && answers[currentQ.id] === undefined) {
      setValidationError("This question is required. Please provide an answer before continuing.")
      return
    }
    // Check for empty string answers (for text fields)
    const answer = currentQ ? answers[currentQ.id] : undefined
    if (currentQ && typeof answer === "string" && !answer.trim()) {
      setValidationError("This question is required. Please provide an answer before continuing.")
      return
    }
    setValidationError(null)
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }, [currentQuestion, totalQuestions, questions, answers])

  const handleSubmit = useCallback(async () => {
    if (!release || !template || !user) return
    setSubmitting(true)
    try {
      const completedData = {
        templateId: release.templateId,
        templateName: template.name,
        releaseId: release.id,
        userId: user.id,
        answers,
        completedAt: new Date().toISOString(),
        weekOf: weekOfLabel,
        organizationId: release.organizationId,
        status: "completed" as const,
      }
      
      if (draftId) {
        // Update existing draft to completed status
        await updateDocument(COLLECTIONS.RESPONSES, draftId, completedData)
      } else {
        // Create new completed response (no draft existed)
        await createDocument(COLLECTIONS.RESPONSES, {
          ...completedData,
          createdAt: new Date().toISOString(),
        })
      }
      setSubmitted(true)
    } catch (err) {
      console.error("Failed to submit scorecard:", err)
    } finally {
      setSubmitting(false)
    }
  }, [release, template, user, answers, weekOfLabel, draftId])

  // Clear all answers and delete draft from DB
  const handleClearScorecard = useCallback(async () => {
    if (!confirm("Are you sure you want to clear all your answers? This cannot be undone.")) {
      return
    }
    
    try {
      // Delete draft from DB if it exists
      if (draftId) {
        await deleteDocument(COLLECTIONS.RESPONSES, draftId)
        setDraftId(null)
      }
      
      // Reset local state
      setAnswers({})
      setCurrentQuestion(0)
      setLastSaved(null)
      setValidationError(null)
    } catch (err) {
      console.error("Failed to clear scorecard:", err)
      alert("Failed to clear scorecard. Please try again.")
    }
  }, [draftId])

  const activeInputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeInputRef.current) {
        const focusable = activeInputRef.current.querySelector<HTMLElement>(
          "input, textarea, button"
        )
        focusable?.focus()
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [currentQuestion])

  // Format remaining time
  function formatRemaining(ms: number) {
    const totalSeconds = Math.floor(ms / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const isUrgent = remainingMs > 0 && remainingMs < 1000 * 60 * 60 * 24 // less than 24h

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No active scorecard
  if (noActive) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No Active Scorecard</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          {"There's no scorecard available for you to complete right now. You'll be notified when a new one is released."}
        </p>
        <Button className="mt-6" variant="outline" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    )
  }
  
  // User already completed the current scorecard - show "All Caught Up"
  if (alreadyCompleted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">{"You're All Caught Up!"}</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Great job completing your most recent scorecard. To see your results, check your dashboard.
        </p>
        <Button 
          className="mt-6 gap-2" 
          onClick={() => router.push("/dashboard#results")}
        >
          View Your Results
          <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">
          {"You'll be notified when a new scorecard is available."}
        </p>
      </div>
    )
  }

  // Expired
  if (expired) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Scorecard Expired</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          This scorecard is no longer accepting responses. The active window has closed.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    )
  }

  // Submitted — show results summary
  if (submitted) {
    return <ResultsSummary answers={answers} template={template} userId={user?.id ?? ""} router={router} />
  }

  return (
    <div>
      {/* Scorecard form below */}
      {/* Remaining time banner */}
      <div
        className={cn(
          "mb-6 flex items-center gap-3 rounded-lg border px-4 py-3",
          isUrgent
            ? "border-destructive/30 bg-destructive/5"
            : "border-primary/30 bg-primary/5"
        )}
      >
        <Clock className={cn("h-5 w-5", isUrgent ? "text-destructive" : "text-primary")} />
        <div className="flex-1">
          <p className={cn("text-sm font-medium", isUrgent ? "text-destructive" : "text-primary")}>
            {isUrgent ? "Hurry! " : ""}Time remaining to complete this scorecard
          </p>
          <p className="text-xs text-muted-foreground">
            Expires {new Date(release!.activeUntil).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "text-base font-bold px-3 py-1",
            isUrgent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}
        >
          {formatRemaining(remainingMs)}
        </Badge>
      </div>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {template?.name ?? "Scorecard"}
          </h1>
          <p className="text-sm font-medium text-primary">
            Scorecard for the week of {weekOfLabel}
          </p>
          <p className="mt-1 text-muted-foreground">
            {template?.description}
          </p>
        </div>
        {Object.keys(answers).length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearScorecard}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Clear Answers
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Questions list */}
        <div className="flex-1">
          {questions.length === 0 && !loading && (
            <div className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 p-6 text-center">
              <p className="text-sm font-medium text-amber-400">No questions found in this scorecard template.</p>
              <p className="mt-1 text-xs text-muted-foreground">Template ID: {release?.templateId ?? "unknown"}</p>
              <p className="text-xs text-muted-foreground">Please contact your admin to configure the scorecard questions.</p>
            </div>
          )}
          <div className="flex flex-col gap-4">
            {questions.map((q, index) => {
              const isActive = index === currentQuestion
              const isAnswered = answers[q.id] !== undefined

              return (
                <Card
                  key={q.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    isActive && "ring-2 ring-primary",
                    isAnswered && !isActive && "border-primary/30 bg-primary/5",
                  )}
                  onClick={() => setCurrentQuestion(index)}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        isAnswered
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isAnswered ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {q.text}
                        </p>
                        <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                          Required
                        </Badge>
                      </div>
                      {isActive && validationError && !isAnswered && (
                        <div className="mt-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          {validationError}
                        </div>
                      )}
                      {isActive && (
                        <div className="mt-3" ref={activeInputRef}>
                          {q.type === "number" && (
                            <Input
                              type="number"
                              placeholder="Enter a number"
                              value={answers[q.id] ?? ""}
                              onChange={(e) =>
                                handleAnswer(q.id, e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  if (index < totalQuestions - 1) {
                                    handleNext()
                                  }
                                }
                              }}
                              className="max-w-xs"
                            />
                          )}
                          {q.type === "scale" && (
                            <div className="flex flex-wrap gap-2">
                              {Array.from(
                                {
                                  length:
                                    (q.scaleMax ?? 10) -
                                    (q.scaleMin ?? 0) +
                                    1,
                                },
                                (_, i) => (q.scaleMin ?? 0) + i,
                              ).map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAnswer(q.id, val)
                                    if (index < totalQuestions - 1) {
                                      setTimeout(() => handleNext(), 200)
                                    }
                                  }}
                                  className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                                    answers[q.id] === val
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-card text-foreground hover:bg-muted",
                                  )}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          )}
                          {q.type === "text" && (
                            <Textarea
                              placeholder="Type your answer... (Cmd+Enter to submit)"
                              value={(answers[q.id] as string) ?? ""}
                              onChange={(e) =>
                                handleAnswer(q.id, e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                  e.preventDefault()
                                  if (index < totalQuestions - 1) {
                                    handleNext()
                                  }
                                }
                              }}
                              rows={3}
                            />
                          )}
                          {q.type === "multichoice" && q.options && (
                            <div className="flex flex-col gap-2">
                              {q.options.map((opt) => (
                                <button
                                  key={opt.label}
                                  type="button"
                                  onClick={() => handleAnswer(q.id, opt.label)}
                                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                                    answers[q.id] === opt.label
                                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                                  }`}
                                >
                                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                                    answers[q.id] === opt.label
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted-foreground/30 text-muted-foreground"
                                  }`}>
                                    {opt.label}
                                  </span>
                                  <span className="text-sm">{opt.value || `Option ${opt.label}`}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {q.type === "confidence" && (
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap gap-2">
                                {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAnswer(q.id, val)
                                      if (index < totalQuestions - 1) {
                                        setTimeout(() => handleNext(), 200)
                                      }
                                    }}
                                    className={cn(
                                      "flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                                      answers[q.id] === val
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-card text-foreground hover:bg-muted",
                                    )}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>Not confident</span>
                                <span>Very confident</span>
                              </div>
                            </div>
                          )}
                          {q.type === "win" && (
                            <div className="flex flex-col gap-2">
                              <Textarea
                                placeholder="Share your biggest win or success with AI this week..."
                                value={(answers[q.id] as string) ?? ""}
                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault()
                                    if (index < totalQuestions - 1) {
                                      handleNext()
                                    }
                                  }
                                }}
                                rows={3}
                              />
                              <p className="text-xs text-muted-foreground">
                                This will appear in your Win of the Month section
                              </p>
                            </div>
                          )}
                          {q.type === "goals" && (
                            <div className="flex flex-col gap-2">
                              <Textarea
                                placeholder="What are your goals for the upcoming week?"
                                value={(answers[q.id] as string) ?? ""}
                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault()
                                    if (index < totalQuestions - 1) {
                                      handleNext()
                                    }
                                  }
                                }}
                                rows={3}
                              />
                              <p className="text-xs text-muted-foreground">
                                Track and complete these in your Weekly Goals section
                              </p>
                            </div>
                          )}
                          {q.type === "time_saving" && (
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { label: "Not using AI yet", value: "0" },
                                  { label: "30 min - 1 hour", value: "0.75" },
                                  { label: "1-2 hours", value: "1.5" },
                                  { label: "2-4 hours", value: "3" },
                                  { label: "4+ hours", value: "5.5" },
                                ].map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleAnswer(q.id, opt.value)}
                                    className={cn(
                                      "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                                      String(answers[q.id]) === opt.value
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Select the amount of time AI helped you save this week
                              </p>
                            </div>
                          )}
                          {q.type === "time_saving_minutes" && (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Under 2 minutes", value: "1" },
          { label: "2-5 minutes", value: "4" },
          { label: "6-10 minutes", value: "8" },
          { label: "11-15 minutes", value: "13" },
          { label: "16+ minutes", value: "20" },
          { label: "Not using AI yet", value: "0" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleAnswer(q.id, opt.value)}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
              String(answers[q.id]) === opt.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Select the time saved in minutes (midpoint values, rounded up)
      </p>
    </div>
  )}
  {index < totalQuestions - 1 && (
                            <Button
                              size="sm"
                              className="mt-3"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNext()
                              }}
                            >
                              Next
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    {!isActive && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Progress sidebar */}
        <div className="w-full lg:w-72">
          <Card className="sticky top-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Progress</CardTitle>
              <CardDescription>
                Question {currentQuestion + 1} of {totalQuestions}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="mb-3 h-2" />
  <p className="mb-2 text-sm text-muted-foreground">
  {completedCount} of {totalQuestions} completed
  </p>
  <p className="mb-2 text-xs text-muted-foreground flex items-center gap-1">
    {autoSaving ? (
      <>
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving...
      </>
    ) : lastSaved ? (
      <>
        <CheckCircle2 className="h-3 w-3 text-green-500" />
        Auto-saved {lastSaved.toLocaleTimeString()}
      </>
    ) : null}
  </p>
              {completedCount < totalQuestions && (
                <p className="mb-4 text-xs text-amber-500">
                  All {totalQuestions} questions are required to submit
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full bg-transparent">
                  <Save className="mr-2 h-4 w-4" />
                  Save & Exit
                </Button>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={completedCount < totalQuestions || submitting}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Submit Scorecard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Results Summary (shown after submission) ────────────────────────────
function ResultsSummary({
  answers,
  template,
  userId,
  router,
}: {
  answers: Record<string, string | number>
  template: TemplateData | null
  userId: string
  router: ReturnType<typeof useRouter>
}) {
const [loading, setLoading] = useState(true)
  const [hoursSaved, setHoursSaved] = useState(0)
  const [prevHours, setPrevHours] = useState<number | null>(null)
  const [benchmark, setBenchmark] = useState<{ deptAvg: number; orgAvg: number; percentile: number; deptName: string } | null>(null)
  const [insight, setInsight] = useState("")
  
  useEffect(() => {
    async function compute() {
      try {
        // 1. Calculate hours saved from this submission
        // Find time-saving questions (type === "time_saving" OR text matches pattern)
        const timeSavingQuestions = template?.questions?.filter(q => {
          if (q.type === "time_saving") return true
          const text = q.text.toLowerCase()
          return (text.includes("time") || text.includes("hours")) && text.includes("save")
        }) ?? []
        
        // Find time-saving MINUTES questions
        const timeSavingMinutesQuestions = template?.questions?.filter(q => {
          return q.type === "time_saving_minutes"
        }) ?? []
        
        // Sum the HOURS - values may be numbers OR strings like "0.75", "1.5", "3", "5.5"
        let totalHours = 0
        for (const q of timeSavingQuestions) {
          const val = answers[q.id]
          if (val !== undefined && val !== null && val !== "") {
            const numVal = typeof val === "number" ? val : parseFloat(String(val))
            if (!isNaN(numVal) && numVal > 0) {
              totalHours += numVal
            }
          }
        }
        
        // Add minutes questions (converted to hours)
        let totalMinutes = 0
        for (const q of timeSavingMinutesQuestions) {
          const val = answers[q.id]
          if (val !== undefined && val !== null && val !== "") {
            const numVal = typeof val === "number" ? val : parseFloat(String(val))
            if (!isNaN(numVal) && numVal > 0) {
              totalMinutes += numVal
            }
          }
        }
        // Convert minutes to hours and add
        totalHours += totalMinutes / 60
        
        const thisHours = Math.round(totalHours * 10) / 10
        setHoursSaved(thisHours)
        
        // Keep score calculation for insight generation
        const scaleVals = Object.values(answers).filter(
          (v) => typeof v === "number" && v >= 1 && v <= 10,
        ) as number[]
        const thisScore =
          scaleVals.length > 0
            ? Math.round((scaleVals.reduce((a, b) => a + b, 0) / scaleVals.length) * 10) / 10
            : 0

        // 2. Fetch historical data for trend + benchmark
        const allResponses = await fetchAllResponses()
        const trend = computePersonalTrend(allResponses, userId)
        const bench = computePersonalBenchmark(allResponses, userId)
        
        // Get previous hours from last submission
        const myResponses = allResponses.filter(r => r.userId === userId)
        if (myResponses.length >= 2) {
          // Sort by date and get previous submission
          const sorted = [...myResponses].sort((a, b) => 
            new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
          )
          const prevResponse = sorted[1] // Second most recent
          if (prevResponse) {
            // Values may be numbers OR strings like "0.75", "1.5", "3", "5.5"
            let prevHoursTotal = 0
            for (const q of timeSavingQuestions) {
              const val = prevResponse.answers[q.id]
              if (val !== undefined && val !== null && val !== "") {
                const numVal = typeof val === "number" ? val : parseFloat(String(val))
                if (!isNaN(numVal) && numVal > 0) {
                  prevHoursTotal += numVal
                }
              }
            }
            setPrevHours(Math.round(prevHoursTotal * 10) / 10)
          }
        }

        if (bench) {
          setBenchmark({
            deptAvg: bench.deptAvg,
            orgAvg: bench.orgAvg,
            percentile: bench.percentile,
            deptName: bench.deptName,
          })
        }

        // 3. Generate insight from template rules or global rules
        const useGlobal = template?.useGlobalInsights !== false
        let scoreRules = template?.scoreInsightRules ?? []
        let pctRules = template?.percentileInsightRules ?? []

        if (useGlobal || scoreRules.length === 0 || pctRules.length === 0) {
          // Fetch global settings
          const globalDoc = await getDocument(COLLECTIONS.SETTINGS, "globalInsights")
          const g = (globalDoc as Record<string, unknown>) ?? {}
          const globalScoreRules = (g.scoreRules as InsightRule[]) ?? []
          const globalPctRules = (g.percentileRules as InsightRule[]) ?? []
          if (useGlobal || scoreRules.length === 0) scoreRules = globalScoreRules
          if (useGlobal || pctRules.length === 0) pctRules = globalPctRules
        }

        // Final fallback if nothing configured anywhere
        if (scoreRules.length === 0) {
          scoreRules = [
            { id: "d1", min: 0, max: 5.9, message: "Every submission builds your baseline. Focus on small, consistent improvements each week." },
            { id: "d2", min: 6, max: 7.9, message: "Solid scores across the board. Look for one area to push from good to great next week." },
            { id: "d3", min: 8, max: 10, message: "Consistently high performance. You're setting the standard for your team." },
          ]
        }
        if (pctRules.length === 0) {
          pctRules = [
            { id: "p1", min: 75, max: 100, message: "You're in the top performers of your organization. Keep leading by example." },
            { id: "p2", min: 50, max: 74, message: "You're scoring above your department average. Keep pushing higher." },
            { id: "p3", min: 0, max: 49, message: "Focus on identifying one area to improve each week to climb the rankings." },
          ]
        }

        const insightLines: string[] = []

        if (trend.length === 0) {
          insightLines.push("Great job completing your first scorecard! Keep it up to build your personal trend data.")
        } else {
          const delta = prevScore !== null ? thisScore - (prevScore ?? 0) : 0
          if (delta > 0.5) {
            insightLines.push(`Strong improvement! Your score jumped ${Math.abs(delta).toFixed(1)} points since your last submission.`)
          } else if (delta < -0.5) {
            insightLines.push(`Your score dipped ${Math.abs(delta).toFixed(1)} points from last time.`)
          }

          // Score-based rule
          const matchedScoreRule = scoreRules.find(
            (r) => thisScore >= r.min && thisScore <= r.max,
          )
          if (matchedScoreRule) {
            insightLines.push(matchedScoreRule.message)
          }
        }

        // Percentile-based rule
        if (bench) {
          const matchedPctRule = pctRules.find(
            (r) => bench.percentile >= r.min && bench.percentile <= r.max,
          )
          if (matchedPctRule) {
            insightLines.push(matchedPctRule.message)
          }
        }

        setInsight(insightLines.join(" "))
      } catch (err) {
        console.error("Failed to compute results:", err)
        setInsight("Your scorecard has been recorded. Visit your dashboard for detailed analytics.")
      } finally {
        setLoading(false)
      }
    }
    compute()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const delta = prevHours !== null ? hoursSaved - prevHours : null
  const TrendIcon = delta !== null && delta > 0 ? TrendingUp : delta !== null && delta < 0 ? TrendingDown : Minus

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Calculating your results...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Scorecard Submitted</h2>
        <p className="mt-1 text-muted-foreground">
          Here{"'"}s how you did on {template?.name ?? "your scorecard"}
        </p>
      </div>

      {/* Hours saved cards row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Hours Saved */}
        <Card>
          <CardContent className="flex flex-col items-center p-6">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Hours Saved</p>
            <p className="text-4xl font-bold text-primary">{hoursSaved}</p>
            <p className="text-xs text-muted-foreground">this week</p>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card>
          <CardContent className="flex flex-col items-center p-6">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">vs. Last Week</p>
            {delta !== null ? (
              <>
                <div className="flex items-center gap-1">
                  <TrendIcon className={cn(
                    "h-6 w-6",
                    delta > 0 ? "text-green-600" : delta < 0 ? "text-red-500" : "text-muted-foreground"
                  )} />
                  <p className={cn(
                    "text-2xl font-bold",
                    delta > 0 ? "text-green-600" : delta < 0 ? "text-red-500" : "text-muted-foreground"
                  )}>
                    {delta > 0 ? "+" : ""}{delta.toFixed(1)} hrs
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">from {prevHours?.toFixed(1)} hrs</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">--</p>
                <p className="text-xs text-muted-foreground">First submission</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Benchmark */}
        <Card>
          <CardContent className="flex flex-col items-center p-6">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Rank</p>
            {benchmark ? (
              <>
                <p className="text-2xl font-bold text-foreground">
                  Top {Math.max(1, 100 - benchmark.percentile)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  vs. {benchmark.deptName} avg
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">--</p>
                <p className="text-xs text-muted-foreground">Not enough data yet</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insight */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 p-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-foreground">Insight</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{insight}</p>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex justify-center gap-3">
        <Button onClick={() => router.push("/dashboard")}>
          <BarChart3 className="mr-2 h-4 w-4" />
          View Full Dashboard
        </Button>
      </div>
    </div>
  )
}
