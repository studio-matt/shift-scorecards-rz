import { describe, expect, it } from "vitest"
import {
  responseMatchesCompletionDateRange,
  selectScorecardPeriods,
  type ScorecardPeriodResponse,
} from "./dashboard-scorecard-periods"

function response(overrides: Partial<ScorecardPeriodResponse>): ScorecardPeriodResponse {
  return {
    id: "response",
    userId: "user-1",
    templateId: "template-1",
    status: "completed",
    completedAt: "2025-05-01T12:00:00.000Z",
    ...overrides,
  }
}

describe("selectScorecardPeriods", () => {
  it("selects latest and previous periods by releaseId", () => {
    const selection = selectScorecardPeriods([
      response({ id: "a", releaseId: "release-a", completedAt: "2025-04-01T12:00:00.000Z" }),
      response({ id: "b", releaseId: "release-b", completedAt: "2025-05-01T12:00:00.000Z" }),
      response({ id: "b2", releaseId: "release-b", completedAt: "2025-05-02T12:00:00.000Z" }),
    ])

    expect(selection.currentPeriod?.key).toBe("release:release-b")
    expect(selection.currentResponses).toHaveLength(2)
    expect(selection.previousPeriod?.key).toBe("release:release-a")
    expect(selection.previousResponses).toHaveLength(1)
  })

  it("falls back to weekOf when releaseId is missing", () => {
    const selection = selectScorecardPeriods([
      response({ id: "old", weekOf: "2025-04-20", completedAt: "2025-04-21T12:00:00.000Z" }),
      response({ id: "new", weekOf: "2025-04-27", completedAt: "2025-04-28T12:00:00.000Z" }),
    ])

    expect(selection.currentPeriod?.key).toBe("week:2025-04-27")
    expect(selection.previousPeriod?.key).toBe("week:2025-04-20")
  })

  it("uses completedAt filters for eligibility without redefining period keys", () => {
    const selection = selectScorecardPeriods(
      [
        response({ id: "early", releaseId: "release-a", completedAt: "2025-05-01T12:00:00.000Z" }),
        response({ id: "late", releaseId: "release-b", completedAt: "2025-05-14T12:00:00.000Z" }),
      ],
      { startDate: "2025-05-10", endDate: "2025-05-14" },
    )

    expect(selection.eligibleResponses.map((r) => r.id)).toEqual(["late"])
    expect(selection.currentPeriod?.key).toBe("release:release-b")
  })

  it("applies an as-of cutoff using completedAt", () => {
    const beforeCutoff = response({
      id: "before",
      releaseId: "release-a",
      completedAt: "2025-05-14T23:59:59.000Z",
    })
    const afterCutoff = response({
      id: "after",
      releaseId: "release-b",
      completedAt: "2025-05-15T00:00:00.000Z",
    })

    expect(responseMatchesCompletionDateRange(beforeCutoff, { endDate: "2025-05-14" })).toBe(true)
    expect(responseMatchesCompletionDateRange(afterCutoff, { endDate: "2025-05-14" })).toBe(false)
  })
})
