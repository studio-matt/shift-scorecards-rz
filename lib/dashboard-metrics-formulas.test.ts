import { describe, it, expect } from "vitest"
import {
  leaderboardPercentVsField,
  leaderboardPctVsFullTimeMonth,
  FULL_TIME_MONTHLY_HOURS,
  orgAvgProductivityPercent,
  rollupMaxWeeklyHoursClaimPerUserWeek,
  type MinimalResponseForHours,
} from "./dashboard-metrics-formulas"

function passthroughTime(v: number | string): number {
  return typeof v === "number" ? v : Number(v) || 0
}

function passthroughMinute(): number {
  return 0
}

describe("leaderboardPctVsFullTimeMonth", () => {
  it("expresses estimated monthly hours as % of one 160h month", () => {
    expect(leaderboardPctVsFullTimeMonth(160)).toBe(100)
    expect(leaderboardPctVsFullTimeMonth(80)).toBe(50)
    expect(leaderboardPctVsFullTimeMonth(304)).toBe(190) // e.g. 276hrs display ≈ ×4 pipeline elsewhere
  })

  it("returns 0 when non-positive or invalid", () => {
    expect(leaderboardPctVsFullTimeMonth(0)).toBe(0)
    expect(leaderboardPctVsFullTimeMonth(-5)).toBe(0)
  })
})

describe("leaderboardPercentVsField (deprecated cohort-relative)", () => {
  it("still supports legacy cohort deltas for tests/back-compat", () => {
    expect(leaderboardPercentVsField(10, 2)).toBe(400)
    expect(leaderboardPercentVsField(8, 8)).toBe(0)
    expect(leaderboardPercentVsField(5, 0)).toBe(0)
  })
})

describe("FULL_TIME_MONTHLY_HOURS", () => {
  it("is 160", () => {
    expect(FULL_TIME_MONTHLY_HOURS).toBe(160)
  })
})

describe("orgAvgProductivityPercent", () => {
  const W = 4 as const // WEEKLY_TO_MONTHLY_MULTIPLIER — same semantics as dashboard-data

  it("uses N times 160 in denominator", () => {
    expect(orgAvgProductivityPercent(320, 2)).toBe(100)
  })

  it("documents naive stacking vs rollup monthly hours (1 user, 4 identical rows, same week)", () => {
    const weeklyHoursPerClaim = 10
    const naiveWeeklySum = weeklyHoursPerClaim * 4
    const monthlyFromNaiveStack = naiveWeeklySum * W
    const rollupWeeklySum = weeklyHoursPerClaim
    const monthlyFromRollup = rollupWeeklySum * W
    expect(monthlyFromNaiveStack).toBe(160)
    expect(monthlyFromRollup).toBe(40)
    expect(orgAvgProductivityPercent(monthlyFromRollup, 1)).toBe(25)
  })
})

describe("rollupMaxWeeklyHoursClaimPerUserWeek", () => {
  const TID = "t1"
  const base = (extras: Partial<MinimalResponseForHours>): MinimalResponseForHours => ({
    userId: "u1",
    weekOf: "2026-04-07",
    answers: { [TID]: 10 },
    ...extras,
  })

  it("stacks across users (no shared user-week cap)", () => {
    const responses: MinimalResponseForHours[] = [
      base({ userId: "a", answers: { [TID]: 10 } }),
      base({ userId: "b", answers: { [TID]: 10 } }),
    ]
    const sum = rollupMaxWeeklyHoursClaimPerUserWeek(
      responses,
      [TID],
      [],
      passthroughTime,
      passthroughMinute,
    )
    expect(sum).toBe(20)
  })

  it("does not stack multiple scorecards same user same week — uses max", () => {
    const responses: MinimalResponseForHours[] = [
      base({ answers: { [TID]: 10 } }),
      base({ answers: { [TID]: 40 } }),
      base({ answers: { [TID]: 25 } }),
    ]
    const sum = rollupMaxWeeklyHoursClaimPerUserWeek(
      responses,
      [TID],
      [],
      passthroughTime,
      passthroughMinute,
    )
    expect(sum).toBe(40)
  })

  it("sums distinct weeks for same user", () => {
    const responses: MinimalResponseForHours[] = [
      base({ weekOf: "2026-04-07", answers: { [TID]: 10 } }),
      base({ weekOf: "2026-04-14", answers: { [TID]: 10 } }),
    ]
    const sum = rollupMaxWeeklyHoursClaimPerUserWeek(
      responses,
      [TID],
      [],
      passthroughTime,
      passthroughMinute,
    )
    expect(sum).toBe(20)
  })
})
