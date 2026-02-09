"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { mockDepartmentPerformance } from "@/lib/mock-data"

export function DepartmentPerformanceChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Department Performance Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockDepartmentPerformance} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="department"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar
                dataKey="avgScore"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                name="Avg Score"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          {mockDepartmentPerformance.slice(0, 3).map((dept) => (
            <div
              key={dept.department}
              className="flex items-center gap-2 text-sm"
            >
              <span className="font-medium text-foreground">
                {dept.department}
              </span>
              <span className="font-bold text-foreground">{dept.avgScore}</span>
              <span className="text-xs text-muted-foreground">
                {dept.participants} participants
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
