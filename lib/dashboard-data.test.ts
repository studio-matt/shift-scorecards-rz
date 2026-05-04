import { describe, expect, it } from "vitest"
import { computeUserHoursMetrics, type RawResponse } from "./dashboard-data"

describe("computeUserHoursMetrics", () => {
  it("counts legacy positional answer ids when included in time-saving ids", () => {
    const now = new Date()
    const response: RawResponse = {
      id: "response-1",
      templateId: "template-1",
      releaseId: "release-1",
      userId: "user-1",
      userName: "User One",
      organizationId: "org-1",
      department: "Ops",
      completedAt: now.toISOString(),
      weekOf: now.toISOString().slice(0, 10),
      weekDate: now.toISOString().slice(0, 10),
      answers: {
        q1: 1.5,
        q2: "0.75",
        q10: "9",
      },
    }

    const metrics = computeUserHoursMetrics([response], "user-1", ["time-email", "q1", "q2"], ["q10"])

    expect(metrics.thisMonthHours).toBe(2.3)
    expect(metrics.totalHoursSavedAllTime).toBe(2.3)
    expect(metrics.confidenceScore).toBe(9)
  })
})
