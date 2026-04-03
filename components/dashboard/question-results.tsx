"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { QuestionResult } from "@/lib/types"

interface QuestionResultsProps {
  data: QuestionResult[]
}

export function QuestionResults({ data }: QuestionResultsProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Question Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            No question data available yet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Question Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {data.map((result) => {
            const change = result.change ?? 0
            const isUp = change > 0
            const isDown = change < 0
            const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus
            const trendColor = isUp ? "text-emerald-500" : isDown ? "text-red-500" : "text-muted-foreground"
            
            return (
              <div
                key={result.question}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <p className="flex-1 text-sm font-medium text-foreground">
                  {result.question}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-foreground">
                    {typeof result.score === "number" ? result.score.toFixed(1) : "—"}
                  </span>
                  <div className={`flex items-center gap-1 ${trendColor}`}>
                    <TrendIcon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">
                      {isUp ? "+" : ""}{change !== 0 ? change.toFixed(1) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
