export function parseDateLike(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === "object") {
    const candidate = value as { toDate?: () => unknown; seconds?: unknown; nanoseconds?: unknown }
    if (typeof candidate.toDate === "function") {
      const date = candidate.toDate()
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null
    }
    if (typeof candidate.seconds === "number") {
      const nanos = typeof candidate.nanoseconds === "number" ? candidate.nanoseconds : 0
      const date = new Date(candidate.seconds * 1000 + Math.floor(nanos / 1e6))
      return Number.isNaN(date.getTime()) ? null : date
    }
  }
  return null
}

export function dateLikeToIsoString(value: unknown): string {
  return parseDateLike(value)?.toISOString() ?? ""
}
