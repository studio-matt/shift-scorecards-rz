import { describe, expect, it } from "vitest"
import {
  buildPlatformSummaryCsv,
  buildPlatformSummaryMetrics,
} from "./export-scorecard-platform-summary"
import type {
  ExportResponseRow,
  ExportTemplateQuestion,
  RespondentContact,
} from "./export-scorecard-responses-csv"

const questions: ExportTemplateQuestion[] = [
  { id: "hours", text: "How many hours did AI save you this week?", type: "time_saving", order: 1 },
  { id: "minutes", text: "Minutes saved", type: "time_saving_minutes", order: 2 },
  { id: "confidence", text: "AI confidence", type: "confidence", order: 3 },
]

const templateQuestionsByTemplateId = new Map<string, ExportTemplateQuestion[]>([
  ["template", questions],
])

function response(
  id: string,
  userId: string,
  weekOf: string,
  answers: Record<string, number | string>,
): ExportResponseRow {
  return {
    id,
    templateId: "template",
    completedAt: "2026-04-15T12:00:00.000Z",
    weekOf,
    organizationId: "org",
    userId,
    answers,
  }
}

function contact(name: string): RespondentContact {
  return {
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    regionOrCohort: "Cohort A",
  }
}

describe("buildPlatformSummaryMetrics", () => {
  it("uses max-per-user-week org rollup, minutes, org hourly rate, and leaderboard averages", () => {
    const metrics = buildPlatformSummaryMetrics({
      responses: [
        response("r1", "u1", "2026-04-06", { hours: 10, confidence: 9 }),
        response("r2", "u1", "2026-04-06", { hours: 20, confidence: 8 }),
        response("r3", "u2", "2026-04-06", { hours: 5, minutes: 30, confidence: 4 }),
      ],
      templateQuestionsByTemplateId,
      respondentByUserId: {
        u1: contact("Ada Lovelace"),
        u2: contact("Grace Hopper"),
      },
      organization: { id: "org", name: "Example Org", hourlyRate: 125 },
    })

    expect(metrics.weeklyHours).toBe(25.5)
    expect(metrics.monthlyHours).toBe(102)
    expect(metrics.activeParticipants).toBe(2)
    expect(metrics.avgProductivityPercent).toBe(31.9)
    expect(metrics.monthlyValue).toBe(12750)
    expect(metrics.annualValue).toBe(153000)
    expect(metrics.avgConfidence).toBe(7)
    expect(metrics.confidenceDistribution).toEqual({
      score1To3: 0,
      score4To6: 1,
      score7To8: 1,
      score9To10: 1,
    })
    expect(metrics.topPerformers[0]).toMatchObject({
      name: "Ada Lovelace",
      weeklyHours: 15,
      monthlyHours: 60,
      productivityPercent: 38,
      responseCount: 2,
    })
  })

  it("excludes opted-out users from top performers", () => {
    const metrics = buildPlatformSummaryMetrics({
      responses: [
        response("r1", "participant", "2026-04-06", { hours: 8 }),
        response("r2", "admin", "2026-04-06", { hours: 80 }),
      ],
      templateQuestionsByTemplateId,
      respondentByUserId: {
        participant: contact("Participant User"),
        admin: { ...contact("Admin User"), excludeFromReporting: true },
      },
      organization: { id: "org", name: "Example Org", hourlyRate: 100 },
    })

    expect(metrics.topPerformers).toHaveLength(1)
    expect(metrics.topPerformers[0]?.name).toBe("Participant User")
  })

  it("matches the Alera screenshot fixture without hardcoding the organization", () => {
    const topWeekly = [
      ["Jessica Armstrong", 42],
      ["Kelly Leach", 37],
      ["Stephanie Svenson", 37],
      ["Sherri Wright", 32.8],
      ["Rachel White", 32.8],
      ["Nathan Lacroix", 32.2],
      ["Terri Monick", 32],
      ["Summer Hampton", 30.5],
      ["Matt Maurer", 26.8],
      ["Mitchell Hagan", 26.2],
    ] as const
    const topTotal = topWeekly.reduce((sum, [, hours]) => sum + hours, 0)
    const remainingWeekly = (988.5 - topTotal) / 60
    const responses: ExportResponseRow[] = []
    const respondentByUserId: Record<string, RespondentContact> = {}

    topWeekly.forEach(([name, hours], index) => {
      const userId = `top-${index}`
      responses.push(response(`r-${userId}`, userId, "2026-04-01", { hours, confidence: 9 }))
      respondentByUserId[userId] = contact(name)
    })

    for (let i = 0; i < 60; i += 1) {
      const userId = `participant-${i}`
      responses.push(response(`r-${userId}`, userId, "2026-04-01", { hours: remainingWeekly }))
      respondentByUserId[userId] = contact(`Participant ${i + 1}`)
    }

    const metrics = buildPlatformSummaryMetrics({
      responses,
      templateQuestionsByTemplateId,
      respondentByUserId,
      organization: { id: "org", name: "Fixture Org", hourlyRate: 125 },
    })

    expect(metrics.activeParticipants).toBe(70)
    expect(metrics.weeklyHours).toBe(988.5)
    expect(metrics.monthlyHours).toBe(3954)
    expect(Math.round(metrics.avgProductivityPercent)).toBe(35)
    expect(metrics.monthlyValue).toBe(494250)
    expect(metrics.annualValue).toBe(5931000)
    expect(metrics.topPerformers[0]).toMatchObject({
      name: "Jessica Armstrong",
      weeklyHours: 42,
      monthlyHours: 168,
      productivityPercent: 105,
    })
  })
})

describe("buildPlatformSummaryCsv", () => {
  it("exports formula notes and top performer rows", () => {
    const metrics = buildPlatformSummaryMetrics({
      responses: [response("r1", "u1", "2026-04-06", { hours: 10, confidence: 9 })],
      templateQuestionsByTemplateId,
      respondentByUserId: { u1: contact("Ada Lovelace") },
      organization: { id: "org", name: "Example Org", hourlyRate: 100 },
    })
    const csv = buildPlatformSummaryCsv({
      metrics,
      generatedAt: "2026-04-30T00:00:00.000Z",
    })

    expect(csv).toContain('"Monthly Hours","40","Weekly hours x 4"')
    expect(csv).toContain('"Avg Productivity Percent","25","Monthly hours / (participants x 160)"')
    expect(csv).toContain('"1","Ada Lovelace"')
  })
})
