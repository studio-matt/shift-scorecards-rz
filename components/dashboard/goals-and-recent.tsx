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
import { CheckCircle2, Clock, Circle, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MostImprovedEntry, RecentScorecard } from "@/lib/dashboard-data"

const defaultGoals = [
  { text: "Complete weekly scorecard", status: "completed" },
  { text: "Score 8+ on AI productivity", status: "in-progress" },
  { text: "Explore one new AI tool", status: "in-progress" },
  { text: "Share an AI tip with a teammate", status: "not-started" },
]

function GoalIcon({ status }: { status: string }) {
  if (status === "completed")
    return <CheckCircle2 className="h-4 w-4 text-success" />
  if (status === "in-progress")
    return <Clock className="h-4 w-4 text-warning" />
  return <Circle className="h-4 w-4 text-muted-foreground" />
}

export function GoalsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Weekly Goals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {defaultGoals.map((goal) => (
            <div
              key={goal.text}
              className="flex items-center gap-3 rounded-md p-2"
            >
              <GoalIcon status={goal.status} />
              <span
                className={cn(
                  "flex-1 text-sm",
                  goal.status === "completed"
                    ? "text-muted-foreground line-through"
                    : "text-foreground",
                )}
              >
                {goal.text}
              </span>
              <Badge
                variant={
                  goal.status === "completed"
                    ? "secondary"
                    : goal.status === "in-progress"
                      ? "default"
                      : "outline"
                }
                className="text-xs capitalize"
              >
                {goal.status.replace("-", " ")}
              </Badge>
            </div>
          ))}
        </div>
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
  data: RecentScorecard[]
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
            {data.map((sc, idx) => (
              <div
                key={`${sc.userId}-${idx}`}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <Link href={`/dashboard?viewUser=${sc.userId}`} className="text-sm font-medium text-foreground">
                    {sc.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {sc.templateName} &middot; {sc.date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    {sc.score}
                  </span>
                  <span className="text-xs text-muted-foreground">avg</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
