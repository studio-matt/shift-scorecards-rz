"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, Circle, Target, TrendingUp, TrendingDown, Minus, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MostImprovedEntry, RecentScorecard } from "@/lib/dashboard-data"

// Goal entry from scorecard responses
export interface GoalEntry {
  id: string
  text: string
  weekOf: string
  completedAt?: string
  status: "completed" | "in-progress" | "not-started"
}

function GoalIcon({ status }: { status: string }) {
  if (status === "completed")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  if (status === "in-progress")
    return <Clock className="h-4 w-4 text-amber-500" />
  return <Circle className="h-4 w-4 text-muted-foreground" />
}

interface GoalsCardProps {
  goals?: GoalEntry[]
  onMarkComplete?: (goalId: string) => void
}

export function GoalsCard({ goals = [], onMarkComplete }: GoalsCardProps) {
  // Group by status for display - show incomplete first, then completed
  const sortedGoals = [...goals].sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return 1
    if (a.status !== "completed" && b.status === "completed") return -1
    return 0
  })

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-emerald-500" />
          Weekly Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {sortedGoals.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Goals from your scorecard responses will appear here
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedGoals.map((goal) => (
              <div
                key={goal.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2 transition-all",
                  goal.status === "completed"
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-border/50 bg-muted/30 hover:bg-muted/50"
                )}
              >
                <button
                  type="button"
                  onClick={() => goal.status !== "completed" && onMarkComplete?.(goal.id)}
                  className={cn(
                    "shrink-0 transition-transform",
                    goal.status !== "completed" && "hover:scale-110 cursor-pointer"
                  )}
                  disabled={goal.status === "completed"}
                >
                  <GoalIcon status={goal.status} />
                </button>
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-sm block",
                      goal.status === "completed"
                        ? "text-muted-foreground line-through"
                        : "text-foreground",
                    )}
                  >
                    {goal.text}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Week of {goal.weekOf}
                  </span>
                </div>
                <Badge
                  variant={goal.status === "completed" ? "secondary" : "outline"}
                  className={cn(
                    "text-[10px] shrink-0",
                    goal.status === "completed" && "bg-emerald-500/20 text-emerald-400"
                  )}
                >
                  {goal.status === "completed" ? "Done" : "Active"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface MostImprovedProps {
  showCompany?: boolean
  data: MostImprovedEntry[]
}

export function MostImprovedCard({ showCompany = false, data }: MostImprovedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Most Improved This Month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {data.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No results match the current filters
            </p>
          )}
          {data.map((person, idx) => (
            <div
              key={`${person.userId}-${idx}`}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div>
                <Link href={`/dashboard?viewUser=${person.userId}`} className="text-sm font-medium text-foreground">
                  {person.name}
                </Link>
                {showCompany ? (
                  <p className="text-xs text-muted-foreground">
                    {person.company} &middot; {person.department}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {person.department}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-success">
                  +{person.improvement}
                </p>
                <p className="text-xs text-muted-foreground">
                  {person.from} to {person.to}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface RecentScorecardsCardProps {
  data: (RecentScorecard & { delta?: number; answers?: Record<string, unknown>; questions?: { id: string; text: string; type: string }[] })[]
}

export function RecentScorecardsCard({ data }: RecentScorecardsCardProps) {
  const [selectedScorecard, setSelectedScorecard] = useState<(typeof data)[0] | null>(null)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Recent Scorecards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No scorecard submissions yet
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.map((sc, idx) => {
                const delta = sc.delta ?? 0
                const isUp = delta > 0
                const isDown = delta < 0
                const DeltaIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus
                const deltaColor = isUp ? "text-emerald-500" : isDown ? "text-red-500" : "text-muted-foreground"
                
                return (
                  <div
                    key={`${sc.userId}-${idx}`}
                    className="flex items-center justify-between rounded-md border border-border p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {sc.date}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sc.templateName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1.5 ${deltaColor}`}>
                        <DeltaIcon className="h-4 w-4" />
                        <span className="text-sm font-semibold">
                          {isUp ? "+" : ""}{delta !== 0 ? delta.toFixed(1) : "—"}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        onClick={() => setSelectedScorecard(sc)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Results Modal */}
      <Dialog open={!!selectedScorecard} onOpenChange={(open) => !open && setSelectedScorecard(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-1">
              <span>{selectedScorecard?.templateName}</span>
              <span className="text-sm font-normal text-muted-foreground">{selectedScorecard?.date}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-4">
            {selectedScorecard?.questions && selectedScorecard?.answers ? (
              selectedScorecard.questions.map((q, idx) => {
                const answer = selectedScorecard.answers?.[q.id]
                const displayAnswer = answer !== undefined && answer !== null
                  ? typeof answer === "number"
                    ? answer.toString()
                    : typeof answer === "string"
                    ? answer
                    : JSON.stringify(answer)
                  : "No response"
                
                return (
                  <div key={q.id} className="rounded-lg border border-border/50 bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Question {idx + 1}</p>
                    <p className="text-sm font-medium text-foreground mb-2">{q.text}</p>
                    <div className="rounded-md bg-background/50 px-3 py-2">
                      <p className="text-sm text-foreground">
                        {q.type === "scale" && typeof answer === "number" ? (
                          <span className="font-semibold">{answer}/10</span>
                        ) : q.type === "time_saving" && typeof answer === "number" ? (
                          <span className="font-semibold">{answer} minutes</span>
                        ) : (
                          displayAnswer
                        )}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Response details not available for this scorecard
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
