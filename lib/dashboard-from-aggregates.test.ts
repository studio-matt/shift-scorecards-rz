import { describe, it, expect } from "vitest"
import {
  aggregateDocsToWeeklyTrend,
  orgHoursMetricsFromAggregateStats,
  adminStatsFromAggregates,
} from "./dashboard-from-aggregates"

describe("dashboard-from-aggregates", () => {
  it("orgHoursMetricsFromAggregateStats applies ×4 weekly→monthly and N×160 denominator", () => {
    const m = orgHoursMetricsFromAggregateStats({
      totalHoursSavedSum: 40,
      responseCountSum: 10,
      avgConfidence: 8,
      participantCount: 2,
      hourlyRate: 100,
    })
    expect(m.monthlyHours).toBe(160)
    expect(m.avgProductivityPercent).toBe(50)
  })

  it("weekly trend buckets org-level dailies by ISO week", () => {
    const wt = aggregateDocsToWeeklyTrend([
      {
        date: "2026-04-28",
        confidenceSum: 80,
        responseCount: 10,
        avgConfidence: 8,
        totalHoursSaved: 5,
        organizationId: "o1",
        department: "all",
        userId: "all",
      } as unknown as import("./aggregates").DailyAggregate,
    ])
    expect(wt.length).toBeGreaterThan(0)
    expect(wt[0]!.score).toBe(8)
  })

  it("adminStatsFromAggregates maps completion from participants", () => {
    const a = adminStatsFromAggregates({
      avgConfidence: 7,
      participantCount: 5,
      responseCount: 20,
      totalUsers: 10,
      totalOrgs: 3,
    })
    expect(a.activeUsers).toBe(5)
    expect(a.completionRate).toBe(50)
    expect(a.avgScore).toBe(7)
  })
})
