import type { DayOfWeek, ExecutiveReportSchedule } from "@/lib/types"

const DAY_NUM: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

function isoDate(d: Date): string {
  return d.toISOString()
}

function parseTimeOfDay(timeOfDay: string): { hours: number; minutes: number } {
  const [h, m] = String(timeOfDay || "").split(":").map((n) => parseInt(n, 10))
  return {
    hours: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 9,
    minutes: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  }
}

function formatInTimeZoneParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
  const parts = fmt.formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value
  return {
    year: parseInt(get("year") || "1970", 10),
    month: parseInt(get("month") || "1", 10),
    day: parseInt(get("day") || "1", 10),
    hour: parseInt(get("hour") || "0", 10),
    minute: parseInt(get("minute") || "0", 10),
  }
}

/**
 * Convert a "local time in IANA timezone" to a UTC Date.
 * Small iterative method that handles DST shifts without extra deps.
 */
function zonedDateTimeToUtcDate(args: {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  timeZone: string
}): Date {
  const { year, month, day, hour, minute, timeZone } = args
  // Initial guess: treat local as UTC.
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0))
  for (let i = 0; i < 3; i++) {
    const p = formatInTimeZoneParts(guess, timeZone)
    // Difference between what guess looks like in tz vs what we want.
    const wanted = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
    const seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0)
    const deltaMs = seen - wanted
    if (Math.abs(deltaMs) < 30_000) break
    guess = new Date(guess.getTime() - deltaMs)
  }
  return guess
}

function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function startOfUtcDay(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function startOfWeekUtc(date: Date): Date {
  const d = startOfUtcDay(date)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - day)
  return d
}

export function computeNextScheduledAt(
  schedule: ExecutiveReportSchedule,
  now = new Date(),
): string {
  if (!schedule.enabled) return ""
  const timeZone = schedule.timezone || "UTC"
  const { hours, minutes } = parseTimeOfDay(schedule.timeOfDay)
  const allowedDays = (schedule.daysOfWeek || [])
    .map((d) => DAY_NUM[d])
    .filter((n) => Number.isFinite(n))
  const intervalWeeks = Math.max(1, Math.min(26, Math.floor(schedule.intervalWeeks || 1)))

  const anchorIso =
    schedule.anchorDate && /^\d{4}-\d{2}-\d{2}$/.test(schedule.anchorDate)
      ? `${schedule.anchorDate}T00:00:00.000Z`
      : schedule.lastGeneratedAt || schedule.nextScheduledAt || ""
  const anchor = anchorIso ? new Date(anchorIso) : now
  const anchorWeekStart = startOfWeekUtc(anchor)

  // Search forward up to ~6 months for the next valid slot.
  for (let deltaDay = 0; deltaDay < 7 * 26; deltaDay++) {
    // Candidate day in UTC, but we'll interpret its weekday in the timezone.
    const candidateUtcDay = addDaysUTC(startOfUtcDay(now), deltaDay)
    const parts = formatInTimeZoneParts(candidateUtcDay, timeZone)
    // Determine tz weekday by formatting in tz and using a Date that matches those parts.
    const asUtcFromTzMidnight = zonedDateTimeToUtcDate({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 0,
      minute: 0,
      timeZone,
    })
    const tzWeekday = formatInTimeZoneParts(asUtcFromTzMidnight, timeZone) // stable parts for that local day
    // We still need actual weekday number in tz; easiest is Intl weekday short.
    const weekdayStr = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(
      asUtcFromTzMidnight,
    )
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    }
    const tzDow = weekdayMap[weekdayStr] ?? 1
    if (allowedDays.length > 0 && !allowedDays.includes(tzDow)) continue

    const candidateLocalUtc = zonedDateTimeToUtcDate({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: hours,
      minute: minutes,
      timeZone,
    })

    // Interval gating: only allow weeks where weeksSinceAnchor % intervalWeeks == 0
    const candidateWeekStart = startOfWeekUtc(candidateLocalUtc)
    const weeksSinceAnchor = Math.floor(
      (candidateWeekStart.getTime() - anchorWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000),
    )
    if (weeksSinceAnchor < 0) continue
    if (weeksSinceAnchor % intervalWeeks !== 0) continue
    if (candidateLocalUtc.getTime() <= now.getTime()) continue

    return isoDate(candidateLocalUtc)
  }

  // Fallback: 7 days out at the same time
  const fallback = addDaysUTC(now, 7)
  const p = formatInTimeZoneParts(fallback, timeZone)
  return isoDate(
    zonedDateTimeToUtcDate({
      year: p.year,
      month: p.month,
      day: p.day,
      hour: hours,
      minute: minutes,
      timeZone,
    }),
  )
}
