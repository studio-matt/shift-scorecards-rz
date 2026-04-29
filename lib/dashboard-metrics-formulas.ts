/**
 * Pure numeric helpers shared by dashboard metrics and tests.
 * See MATH AUDIT comment block at top of dashboard-data.ts.
 */

/** Leaderboard streak / TopPerformer: % above cohort mean of estimated monthly hours (not vs 160). */
export function leaderboardPercentVsField(
  monthlyHours: number,
  fieldAverageHours: number,
): number {
  return fieldAverageHours > 0
    ? Math.round(((monthlyHours - fieldAverageHours) / fieldAverageHours) * 100)
    : 0
}

/** Org KPI: productivity % from monthly hours and participant count × 160. */
export function orgAvgProductivityPercent(
  monthlyHours: number,
  activeParticipants: number,
): number {
  const denom = activeParticipants > 0 ? activeParticipants * 160 : 160
  return (monthlyHours / denom) * 100
}

export type MinimalResponseForHours = {
  userId: string
  weekOf: string
  answers: Record<string, number | string>
}

/**
 * Sums weekly hours saved with one value per (userId, weekOf): the maximum of per-response
 * totals for that week. Avoids stacking multiple scorecard rows in the same week for the
 * same person into an inflated org total.
 */
export function rollupMaxWeeklyHoursClaimPerUserWeek(
  responses: MinimalResponseForHours[],
  timeSavingIds: string[],
  minutesSavingIds: string[],
  parseTime: (v: number | string) => number,
  parseMinute: (v: number | string) => number,
): number {
  const perUserWeek = new Map<string, number>()

  for (const r of responses) {
    let responseHours = 0
    for (const qId of timeSavingIds) {
      const val = r.answers[qId]
      if (val !== undefined && val !== null && val !== "") {
        const hours = parseTime(val)
        if (hours > 0) responseHours += hours
      }
    }
    for (const qId of minutesSavingIds) {
      const val = r.answers[qId]
      if (val !== undefined && val !== null && val !== "") {
        const minutes = parseMinute(val)
        if (minutes > 0) responseHours += minutes / 60
      }
    }
    const key = `${r.userId}\t${r.weekOf ?? ""}`
    const prev = perUserWeek.get(key) ?? 0
    perUserWeek.set(key, Math.max(prev, responseHours))
  }

  let total = 0
  for (const v of perUserWeek.values()) {
    total += v
  }
  return total
}
