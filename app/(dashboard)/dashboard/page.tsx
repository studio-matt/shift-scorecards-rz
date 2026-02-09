"use client"

import { useAuth } from "@/lib/auth-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatCards } from "@/components/dashboard/stat-cards"
import { TopPerformers } from "@/components/dashboard/top-performers"
import { DepartmentPerformanceChart } from "@/components/dashboard/department-performance"
import { WeeklyTrendChart } from "@/components/dashboard/weekly-trend"
import { QuestionResults } from "@/components/dashboard/question-results"
import {
  GoalsCard,
  MostImprovedCard,
  RecentScorecardsCard,
} from "@/components/dashboard/goals-and-recent"

export default function DashboardPage() {
  const { isAdmin } = useAuth()

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Track your scorecard progress and performance metrics
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="this-week">
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-30">Last 30 Days</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {/* Key Metrics */}
        <StatCards />

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WeeklyTrendChart />
          <DepartmentPerformanceChart />
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopPerformers />
          <GoalsCard />
        </div>

        {/* Question Results */}
        <QuestionResults />

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MostImprovedCard />
          <RecentScorecardsCard />
        </div>
      </div>
    </div>
  )
}
