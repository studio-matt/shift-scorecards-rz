"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { mockQuestions, mockTemplate } from "@/lib/mock-data"
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
import { ChevronRight, Save, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ScorecardPage() {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [submitted, setSubmitted] = useState(false)

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

  const questions = mockQuestions
  const totalQuestions = questions.length
  const completedCount = Object.keys(answers).length
  const progress = (completedCount / totalQuestions) * 100

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

  const handleSubmit = useCallback(() => {
    setSubmitted(true)
  }, [])

  const activeInputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Small delay to let the DOM update after question change
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
          Thank you for completing your AI Productivity Scorecard.
        </p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>
          Go to my Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          {mockTemplate.name}
        </h1>
        <p className="text-sm font-medium text-primary">
          Scorecard for the week of {weekOfLabel}
        </p>
        <p className="mt-1 text-muted-foreground">
          {mockTemplate.description}
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
                                  } else if (completedCount >= totalQuestions) {
                                    handleSubmit()
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
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleAnswer(q.id, val)
                                      if (index < totalQuestions - 1) {
                                        setTimeout(() => handleNext(), 200)
                                      }
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
                                  } else if (completedCount >= totalQuestions) {
                                    handleSubmit()
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
                  disabled={completedCount < totalQuestions}
                >
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
