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
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getActiveRelease,
  getDocument,
  createDocument,
  COLLECTIONS,
} from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import type { ScorecardRelease, ScorecardQuestion } from "@/lib/types"

interface TemplateData {
  id: string
  name: string
  description: string
  questions: ScorecardQuestion[]
}

export default function ScorecardPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [release, setRelease] = useState<ScorecardRelease | null>(null)
  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [expired, setExpired] = useState(false)
  const [noActive, setNoActive] = useState(false)

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Remaining time countdown
  const [remainingMs, setRemainingMs] = useState(0)

  // Load active release and its template
  useEffect(() => {
    async function load() {
      try {
        const activeRel = await getActiveRelease()
        if (!activeRel) {
          setNoActive(true)
          setLoading(false)
          return
        }

        const rel = activeRel as unknown as ScorecardRelease
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
        }
      } catch (err) {
        console.error("Failed to load scorecard:", err)
        setNoActive(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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

  const handleAnswer = useCallback(
    (questionId: string, value: string | number) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }))
    },
    [],
  )

  const handleNext = useCallback(() => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }, [currentQuestion, totalQuestions])

  const handleSubmit = useCallback(async () => {
    if (!release || !template || !user) return
    setSubmitting(true)
    try {
      await createDocument(COLLECTIONS.RESPONSES, {
        templateId: release.templateId,
        releaseId: release.id,
        userId: user.id,
        answers,
        completedAt: new Date().toISOString(),
        weekOf: weekOfLabel,
        organizationId: release.organizationId,
      })
      setSubmitted(true)
    } catch (err) {
      console.error("Failed to submit scorecard:", err)
    } finally {
      setSubmitting(false)
    }
  }, [release, template, user, answers, weekOfLabel])

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

  // Submitted
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-foreground">
          Scorecard Submitted
        </h2>
        <p className="mt-2 text-muted-foreground">
          Thank you for completing your {template?.name ?? "scorecard"}.
        </p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>
          Go to my Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div>
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

      <div className="mb-8">
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

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Questions list */}
        <div className="flex-1">
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
                      <p className="text-sm font-medium text-foreground">
                        {q.text}
                      </p>
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
              <p className="mb-6 text-sm text-muted-foreground">
                {completedCount} of {totalQuestions} completed
              </p>
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
