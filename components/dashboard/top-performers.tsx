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

export function TopPerformers() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Champions Dashboard
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Top Performers This Week
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {mockTopPerformers.map((performer, index) => (
            <div
              key={performer.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                  {performer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {performer.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {performer.department}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">
                  {performer.avgScore}
                </p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {performer.streak} streak
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
