import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'

export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

export function prevMonth(month: string): string {
  const d = parseISO(`${month}-01`)
  d.setMonth(d.getMonth() - 1)
  return format(d, 'yyyy-MM')
}

export function nextMonth(month: string): string {
  const d = parseISO(`${month}-01`)
  d.setMonth(d.getMonth() + 1)
  return format(d, 'yyyy-MM')
}

export function formatMonthLabel(month: string): string {
  return format(parseISO(`${month}-01`), 'MMMM yyyy')
}

export function monthDateRange(month: string): { dateFrom: string; dateTo: string } {
  const monthDate = parseISO(`${month}-01`)
  return {
    dateFrom: format(startOfMonth(monthDate), 'yyyy-MM-dd'),
    dateTo: format(endOfMonth(monthDate), 'yyyy-MM-dd'),
  }
}

export type MonthStatus = 'future' | 'in_progress' | 'closed'

export interface MonthStatusInfo {
  status: MonthStatus
  dayOfMonth: number | null
  daysInMonth: number
}

/**
 * Classifies a YYYY-MM month relative to today.
 * - 'in_progress' if the month contains today
 * - 'closed' if the month ended before today
 * - 'future' if the month starts after today
 * dayOfMonth is null for closed/future months.
 */
export function monthStatus(month: string, now: Date = new Date()): MonthStatusInfo {
  const monthDate = parseISO(`${month}-01`)
  const start = startOfMonth(monthDate)
  const end = endOfMonth(monthDate)
  const daysInMonth = end.getDate()

  if (now < start) {
    return { status: 'future', dayOfMonth: null, daysInMonth }
  }
  if (now > end) {
    return { status: 'closed', dayOfMonth: null, daysInMonth }
  }
  return { status: 'in_progress', dayOfMonth: now.getDate(), daysInMonth }
}
