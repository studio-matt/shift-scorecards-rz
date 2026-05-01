/**
 * Long-form CSV export for scorecard responses (one row per question answer).
 * Used by Previous Scorecards UI and custom export modal.
 */

export interface ExportTemplateQuestion {
  id: string
  text: string
  type: string
  order: number
  min?: number
  max?: number
  /** multichoice: letter in `label`, human copy in `value` (matches scorecard UI). */
  options?: { label: string; value: string }[]
}

export interface ExportResponseRow {
  id: string
  templateId: string
  completedAt: string
  weekOf: string
  organizationId: string
  userId: string
  answers: Record<string, number | string>
}

export interface RespondentContact {
  name: string
  email: string
  regionOrCohort: string
  excludeFromReporting?: boolean
}

export function questionTypeLabelForExport(type: string): string {
  const labels: Record<string, string> = {
    time_saving: "Weekly time saved (hours)",
    time_saving_minutes: "Weekly time saved (minutes)",
    scale: "Rating scale",
    number: "Number",
    confidence: "Confidence",
    goals: "Goals",
    goals_narrative: "Goals (narrative)",
    win: "Win / highlight",
    text: "Short text",
    long_text: "Long text",
    select: "Single choice",
    multichoice: "Multiple choice",
    multi_select: "Multiple choice",
    boolean: "Yes / no",
  }
  return labels[type] ?? type.replace(/_/g, " ")
}

export function formatAnswerForCsvExport(
  q: ExportTemplateQuestion,
  raw: string | number | undefined | null,
): string {
  if (raw === undefined || raw === null) return ""
  const asString = String(raw).trim()
  if (!asString) return ""

  const isMultichoice = q.type === "multichoice" || q.type === "multi_select"
  if (!isMultichoice || !q.options?.length) return asString

  const segments = asString.includes(",")
    ? asString.split(",").map((p) => p.trim()).filter(Boolean)
    : [asString]

  return segments
    .map((part) => {
      const opt = q.options!.find(
        (o) =>
          o.label === part ||
          o.value === part ||
          (o.label && o.label.toLowerCase() === part.toLowerCase()),
      )
      if (!opt) return part
      const copy = (opt.value || "").trim()
      return copy || part
    })
    .join("; ")
}

export function isCompletedResponseDoc(data: Record<string, unknown>): boolean {
  const status = (data.status as string) ?? ""
  const completedAt = (data.completedAt as string) ?? ""
  return status === "completed" || (typeof completedAt === "string" && completedAt.trim().length > 0)
}

export function docToExportResponseRow(
  doc: { id: string } & Record<string, unknown>,
): ExportResponseRow | null {
  if (!isCompletedResponseDoc(doc)) return null
  return {
    id: doc.id,
    templateId: (doc.templateId as string) ?? "",
    completedAt: (doc.completedAt as string) ?? "",
    weekOf: (doc.weekOf as string) ?? "",
    organizationId: (doc.organizationId as string) ?? "",
    userId: (doc.userId as string) ?? "",
    answers: (doc.answers as Record<string, number | string>) ?? {},
  }
}

/** Inclusive calendar dates (YYYY-MM-DD) in UTC for Firestore `completedAt` range queries. */
export function completedAtUtcRangeInclusiveDates(
  startDateYmd: string,
  endDateYmd: string,
): { minInclusive: string; maxExclusive: string } | null {
  if (!startDateYmd?.trim() || !endDateYmd?.trim()) return null
  if (startDateYmd > endDateYmd) return null
  const minInclusive = `${startDateYmd}T00:00:00.000Z`
  const end = new Date(`${endDateYmd}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() + 1)
  return { minInclusive, maxExclusive: end.toISOString() }
}

export function buildScorecardResponsesCsv(params: {
  responses: ExportResponseRow[]
  templateQuestionsByTemplateId: Map<string, ExportTemplateQuestion[]>
  respondentByUserId: Record<string, RespondentContact>
  organizationNameByOrgId: Map<string, string>
}): string {
  const { responses, templateQuestionsByTemplateId, respondentByUserId, organizationNameByOrgId } =
    params

  const csvRows: string[] = []
  csvRows.push(
    [
      "Respondent Name",
      "Respondent Email",
      "Region / Cohort",
      "Organization",
      "Week Of",
      "Completed At",
      "Question",
      "Question Type",
      "Answer",
    ]
      .map((h) => `"${h}"`)
      .join(","),
  )

  for (const response of responses) {
    const qs = templateQuestionsByTemplateId.get(response.templateId) ?? []
    const sorted = [...qs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const contact = respondentByUserId[response.userId]
    const respondentName = contact?.name ?? "Unknown"
    const respondentEmail = contact?.email ?? ""
    const regionOrCohort = contact?.regionOrCohort ?? ""
    const organizationName =
      organizationNameByOrgId.get(response.organizationId) || "Unknown"

    for (const q of sorted) {
      const rawValue = response.answers[q.id]
      const answerCell = formatAnswerForCsvExport(q, rawValue)
      csvRows.push(
        [
          respondentName,
          respondentEmail,
          regionOrCohort,
          organizationName,
          response.weekOf,
          response.completedAt,
          q.text,
          questionTypeLabelForExport(q.type),
          answerCell,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
    }
  }

  return csvRows.join("\n")
}

export function downloadScorecardResponsesCsvFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
