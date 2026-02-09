"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, Circle, Download } from "lucide-react"
import { mockGoals, mockRecentScorecards, mockMostImproved } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

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
          {mockGoals.map((goal) => (
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

export function MostImprovedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Most Improved This Month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {mockMostImproved.map((person) => (
            <div
              key={person.name}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {person.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {person.department}
                </p>
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

export function RecentScorecardsCard() {
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
        <div className="flex flex-col gap-2">
          {mockRecentScorecards.map((sc) => (
            <div
              key={sc.name}
              className="flex items-center justify-between rounded-md border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {sc.name}
                </p>
                <p className="text-xs text-muted-foreground">{sc.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">
                  {sc.score}
                </span>
                <Badge variant="secondary" className="text-xs">
                  Completion Rate
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
