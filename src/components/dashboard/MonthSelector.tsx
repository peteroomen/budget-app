'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { prevMonth, nextMonth, formatMonthLabel, currentMonth } from '@/lib/utils/month'

interface MonthSelectorProps {
  month: string
  allowFuture?: boolean
}

export function MonthSelector({ month, allowFuture = false }: MonthSelectorProps) {
  const now = currentMonth()
  const isCurrentMonth = month === now
  const nextDisabled = isCurrentMonth && !allowFuture

  return (
    <div className="flex items-center gap-2">
      {!isCurrentMonth && (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">This month</Link>
        </Button>
      )}
      <Button variant="outline" size="icon" asChild>
        <Link href={`/dashboard?month=${prevMonth(month)}`}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous month</span>
        </Link>
      </Button>
      <span className="min-w-[140px] text-center text-sm font-medium">
        {formatMonthLabel(month)}
      </span>
      {nextDisabled ? (
        <Button variant="outline" size="icon" disabled>
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next month</span>
        </Button>
      ) : (
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard?month=${nextMonth(month)}`}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next month</span>
          </Link>
        </Button>
      )}
    </div>
  )
}
