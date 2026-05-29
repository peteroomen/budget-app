'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MonthJumpPopover } from '@/components/ui/month-jump-popover'
import { prevMonth, nextMonth, currentMonth } from '@/lib/utils/month'

interface SummaryMonthSelectorProps {
  month: string
  allowFuture?: boolean
}

export function SummaryMonthSelector({ month, allowFuture = false }: SummaryMonthSelectorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const now = currentMonth()
  const isCurrentMonth = month === now

  function navigate(target: string) {
    startTransition(() => {
      router.push(`/summary?month=${target}`)
    })
  }

  return (
    <div
      className={`inline-flex items-center rounded-lg border bg-background transition-opacity ${isPending ? 'opacity-50' : ''}`}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(prevMonth(month))}
        disabled={isPending}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous month</span>
      </Button>
      <MonthJumpPopover selectedMonth={month} onSelect={navigate} allowFuture={allowFuture} />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(nextMonth(month))}
        disabled={(isCurrentMonth && !allowFuture) || isPending}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next month</span>
      </Button>
    </div>
  )
}
