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
