'use client'

import { isValidMonth } from '@/lib/utils/month'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MonthJumpPopover } from '@/components/ui/month-jump-popover'
import { prevMonth, nextMonth, currentMonth } from '@/lib/utils/month'

const MONTH_ROUTES = new Set(['/dashboard', '/budgets', '/summary', '/transactions'])

interface GlobalMonthPickerProps {
  allowFuture?: boolean
}

export function GlobalMonthPicker({ allowFuture = false }: GlobalMonthPickerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  if (!MONTH_ROUTES.has(pathname)) return null

  const now = currentMonth()
  const raw = searchParams.get('month')
  const month = raw && isValidMonth(raw) ? raw : now
  const isCurrentMonth = month === now

  function navigate(target: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', target)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="-ml-2 flex items-center gap-0.5">
      <Button variant="ghost" size="icon" onClick={() => navigate(prevMonth(month))}>
        <ChevronLeft className="h-5 w-5" />
        <span className="sr-only">Previous month</span>
      </Button>
      <MonthJumpPopover selectedMonth={month} onSelect={navigate} allowFuture={allowFuture} />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(nextMonth(month))}
        disabled={isCurrentMonth && !allowFuture}
      >
        <ChevronRight className="h-5 w-5" />
        <span className="sr-only">Next month</span>
      </Button>
    </div>
  )
}
