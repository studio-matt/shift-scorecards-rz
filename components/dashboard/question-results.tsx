"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
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
          {data.map((result) => (
            <div
              key={result.question}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <p className="flex-1 text-sm font-medium text-foreground">
                {result.question}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-foreground">
                  {result.score}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-success">
                  <TrendingUp className="h-3 w-3" />+{result.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
