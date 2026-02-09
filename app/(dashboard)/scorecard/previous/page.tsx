"use client"

import { useState } from "react"
import { mockPastScorecards, mockQuestions } from "@/lib/mock-data"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CalendarDays, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

function formatWeekOf(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatCompleted(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function PreviousScorecardsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = mockPastScorecards.find((s) => s.id === selectedId)

  if (selected) {
    return (
      <div>
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setSelectedId(null)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Previous Scorecards
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            AI Productivity Scorecard
          </h1>
          <p className="text-sm font-medium text-primary">
            Scorecard for the week of {formatWeekOf(selected.weekOf)}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              Completed {formatCompleted(selected.completedAt)}
            </Badge>
            <Badge className="bg-primary text-primary-foreground text-xs">
              Score: {selected.score}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {mockQuestions.map((q, index) => {
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
                                (q.scaleMax ?? 10) - (q.scaleMin ?? 0) + 1,
                            },
                            (_, i) => (q.scaleMin ?? 0) + i,
                          ).map((val) => (
                            <div
                              key={val}
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium",
                                answer === val
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
                          {answer}
                        </p>
                      )}
                      {q.type === "text" && (
                        <p className="rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                          {answer as string}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
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
          View your past scorecard submissions and results.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {mockPastScorecards.map((sc) => (
          <Card
            key={sc.id}
            className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
            onClick={() => setSelectedId(sc.id)}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">
                  Week of {formatWeekOf(sc.weekOf)}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Completed {formatCompleted(sc.completedAt)}
                </CardDescription>
              </div>
              <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
                {sc.score}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockPastScorecards.length === 0 && (
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
