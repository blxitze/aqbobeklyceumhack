/**
 * Returns ISO weekday: 1=Monday ... 5=Friday
 * Matches Python's date.isoweekday()
 * Uses LOCAL date (not UTC) to avoid timezone shift
 */
export function dateToIsoWeekday(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const dow = d.getDay() // 0=Sun, 1=Mon ... 6=Sat
  return dow === 0 ? 7 : dow
}

export function todayLocalISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
