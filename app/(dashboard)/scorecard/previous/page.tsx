"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getDocuments, getDocument, COLLECTIONS } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"

interface PastScorecard {
  id: string
  templateId: string
  templateName: string
  completedAt: string
  weekOf: string
  score: number
  answers: Record<string, number | string>
}

interface TemplateQuestion {
  id: string
  text: string
  type: "scale" | "number" | "text"
  min?: number
  max?: number
  order: number
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function formatShort(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function computeScore(answers: Record<string, number | string>): number {
  const nums = Object.values(answers).filter(
    (v) => typeof v === "number",
  ) as number[]
  if (nums.length === 0) return 0
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

export default function PreviousScorecardsPage() {
  const { user } = useAuth()
  const [scorecards, setScorecards] = useState<PastScorecard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<TemplateQuestion[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)

  const fetchScorecards = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      // For admin users, show ALL responses across all users
      // For regular users, this would filter by userId
      const docs = await getDocuments(COLLECTIONS.RESPONSES)
      const parsed = docs
        .map((d) => {
          const data = d as Record<string, unknown>
          const answers = (data.answers as Record<string, number | string>) ?? {}
          return {
            id: d.id,
            templateId: (data.templateId as string) ?? "",
            templateName: (data.templateName as string) ?? "",
            completedAt: (data.completedAt as string) ?? "",
            weekOf: (data.weekOf as string) ?? "",
            score: computeScore(answers),
            answers,
          }
        })
        .sort(
          (a, b) =>
            new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
        )
      setScorecards(parsed)
    } catch (err) {
      console.error("Failed to fetch past scorecards:", err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchScorecards()
  }, [fetchScorecards])

  // When selecting a scorecard, load its template questions
  async function handleSelect(sc: PastScorecard) {
    setSelectedId(sc.id)
    setQuestionsLoading(true)
    try {
      const tmpl = await getDocument(COLLECTIONS.TEMPLATES, sc.templateId)
      if (tmpl) {
        const data = tmpl as Record<string, unknown>
        const qs = (data.questions as TemplateQuestion[]) ?? []
        setQuestions(qs.sort((a, b) => a.order - b.order))
      }
    } catch (err) {
      console.error("Failed to fetch template questions:", err)
    } finally {
      setQuestionsLoading(false)
    }
  }

  const selected = scorecards.find((s) => s.id === selectedId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (selected) {
    return (
      <div>
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => {
            setSelectedId(null)
            setQuestions([])
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Previous Scorecards
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {selected.templateName || "Scorecard Response"}
          </h1>
          <p className="text-sm font-medium text-primary">
            {selected.weekOf ? `Week ${selected.weekOf}` : ""} &middot;{" "}
            {formatDate(selected.completedAt)}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              Completed {formatShort(selected.completedAt)}
            </Badge>
            <Badge className="bg-primary text-primary-foreground text-xs">
              Score: {selected.score}
            </Badge>
          </div>
        </div>

        {questionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map((q) => {
              const answer = selected.answers[q.id]
              return (
                <Card key={q.id} className="border-border/60">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {q.text}
                      </p>
                      <div className="mt-2">
                        {q.type === "scale" && (
                          <div className="flex flex-wrap gap-2">
                            {Array.from(
                              {
                                length:
                                  (q.max ?? 10) - (q.min ?? 1) + 1,
                              },
                              (_, i) => (q.min ?? 1) + i,
                            ).map((val) => (
                              <div
                                key={val}
                                className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium",
                                  answer !== undefined && Math.round(answer as number) === val
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border/40 bg-muted/50 text-muted-foreground",
                                )}
                              >
                                {val}
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === "number" && (
                          <p className="rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground">
                            {answer ?? "--"}
                          </p>
                        )}
                        {q.type === "text" && (
                          <p className="rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                            {(answer as string) ?? "--"}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {questions.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Template questions could not be loaded.
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Previous Scorecards
        </h1>
        <p className="mt-1 text-muted-foreground">
          View past scorecard submissions and results.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {scorecards.map((sc) => (
          <Card
            key={sc.id}
            className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
            onClick={() => handleSelect(sc)}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">
                  {sc.templateName || sc.weekOf || "Scorecard"}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Completed {formatShort(sc.completedAt)}
                </CardDescription>
              </div>
              <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
                {sc.score}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {scorecards.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">
              No previous scorecards
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your completed scorecards will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
