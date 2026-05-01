import { describe, expect, it } from "vitest"
import {
  completedAtUtcRangeInclusiveDates,
  filterExportResponsesByDepartment,
  type ExportResponseRow,
  type RespondentContact,
} from "./export-scorecard-responses-csv"

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

describe("filterExportResponsesByDepartment", () => {
  const responses: ExportResponseRow[] = [
    {
      id: "r1",
      templateId: "template",
      completedAt: "2026-04-01T00:00:00.000Z",
      weekOf: "2026-04-01",
      organizationId: "org",
      userId: "sales-user",
      answers: {},
    },
    {
      id: "r2",
      templateId: "template",
      completedAt: "2026-04-01T00:00:00.000Z",
      weekOf: "2026-04-01",
      organizationId: "org",
      userId: "ops-user",
      answers: {},
    },
  ]
  const respondents: Record<string, RespondentContact> = {
    "sales-user": { name: "Sales User", email: "sales@example.com", regionOrCohort: "Sales" },
    "ops-user": { name: "Ops User", email: "ops@example.com", regionOrCohort: "Operations" },
  }

  it("returns all responses when no department is selected", () => {
    expect(filterExportResponsesByDepartment(responses, respondents, "all")).toEqual(responses)
  })

  it("returns only responses for the selected department", () => {
    expect(filterExportResponsesByDepartment(responses, respondents, "Sales")).toEqual([
      responses[0],
    ])
  })
})
