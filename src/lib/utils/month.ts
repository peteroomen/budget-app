export const HOUSEHOLD_TIMEZONE = 'Pacific/Auckland'

export function nzDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HOUSEHOLD_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function isValidMonth(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value)
}

function parts(month: string): [number, number] {
  if (!isValidMonth(month)) throw new Error('Invalid month')
  return [Number(month.slice(0, 4)), Number(month.slice(5, 7))]
}

export function currentMonth(): string {
  return nzDate().slice(0, 7)
}

export function prevMonth(month: string): string {
  const [y, m] = parts(month)
  return `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`
}

export function nextMonth(month: string): string {
  const [y, m] = parts(month)
  return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`
}

export function formatMonthLabel(month: string): string {
  parts(month)
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${month}-01T00:00:00Z`))
}

export function monthDateRange(month: string): { dateFrom: string; dateTo: string } {
  const [y, m] = parts(month)
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { dateFrom: `${month}-01`, dateTo: `${month}-${days}` }
}

export type MonthStatus = 'future' | 'in_progress' | 'closed'
export interface MonthStatusInfo {
  status: MonthStatus
  dayOfMonth: number | null
  daysInMonth: number
}

export function monthStatus(month: string, now: Date = new Date()): MonthStatusInfo {
  const { dateFrom, dateTo } = monthDateRange(month)
  const today = nzDate(now)
  const status = today < dateFrom ? 'future' : today > dateTo ? 'closed' : 'in_progress'
  return {
    status,
    dayOfMonth: status === 'in_progress' ? Number(today.slice(8)) : null,
    daysInMonth: Number(dateTo.slice(8)),
  }
}
