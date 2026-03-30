"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, Circle, Download, Target, TrendingUp, TrendingDown, Minus } from "lucide-react"
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
  data: (RecentScorecard & { delta?: number })[]
}

export function RecentScorecardsCard({ data }: RecentScorecardsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Recent Scorecards
        </CardTitle>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-3 w-3" />
          Download Results
        </Button>
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
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {sc.date}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sc.templateName}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 ${deltaColor}`}>
                    <DeltaIcon className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {isUp ? "+" : ""}{delta !== 0 ? delta.toFixed(1) : "—"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
