import { describe, expect, it } from "vitest"
import { completedAtUtcRangeInclusiveDates } from "./export-scorecard-responses-csv"

describe("completedAtUtcRangeInclusiveDates", () => {
  it("returns inclusive UTC day bounds for valid 20xx dates", () => {
    expect(completedAtUtcRangeInclusiveDates("2026-04-01", "2026-04-30")).toEqual({
      minInclusive: "2026-04-01T00:00:00.000Z",
      maxExclusive: "2026-05-01T00:00:00.000Z",
    })
  })

  it("rejects incomplete, pre-2000, invalid, and reversed ranges", () => {
    expect(completedAtUtcRangeInclusiveDates("2026", "2026-04-30")).toBeNull()
    expect(completedAtUtcRangeInclusiveDates("1999-12-31", "2026-04-30")).toBeNull()
    expect(completedAtUtcRangeInclusiveDates("2026-02-31", "2026-04-30")).toBeNull()
    expect(completedAtUtcRangeInclusiveDates("2026-05-01", "2026-04-30")).toBeNull()
  })
})
