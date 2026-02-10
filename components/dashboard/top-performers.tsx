"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { mockTopPerformers } from "@/lib/mock-data"
import type { TopPerformer } from "@/lib/types"

interface TopPerformersProps {
  showCompany?: boolean
  data?: TopPerformer[]
}

export function TopPerformers({ showCompany = false, data }: TopPerformersProps) {
  const performers = data ?? mockTopPerformers
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Champions Dashboard
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {showCompany ? "Top Performers Across All Organizations" : "Top Performers This Week"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {performers.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No performers match the current filters
            </p>
          )}
          {performers.map((performer, index) => (
            <div
              key={performer.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                  {performer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {performer.name}
                </p>
                {showCompany ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {performer.company} &middot; {performer.department}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {performer.department}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-foreground">
                  {performer.avgScore}
                </p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {performer.streak} streak
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
