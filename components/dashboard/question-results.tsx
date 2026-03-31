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
                <div className={`flex items-center gap-1.5 ${trendColor}`}>
                  <TrendIcon className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    {isUp ? "+" : ""}{change !== 0 ? change : "—"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
