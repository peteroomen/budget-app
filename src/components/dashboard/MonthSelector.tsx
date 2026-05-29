'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MonthJumpPopover } from '@/components/ui/month-jump-popover'
import { prevMonth, nextMonth, currentMonth } from '@/lib/utils/month'

interface MonthSelectorProps {
  month: string
  isAdmin?: boolean
}

export function MonthSelector({ month, isAdmin }: MonthSelectorProps) {
  const router = useRouter()
  const now = currentMonth()
  const isCurrentMonth = month === now

  function navigate(target: string) {
    router.push(`/dashboard?month=${target}`)
  }

  return (
    <div className="inline-flex items-center rounded-lg border bg-background">
      <Button variant="ghost" size="icon" onClick={() => navigate(prevMonth(month))}>
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous month</span>
      </Button>
      <MonthJumpPopover selectedMonth={month} onSelect={navigate} allowFuture={!!isAdmin} />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(nextMonth(month))}
        disabled={isCurrentMonth && !isAdmin}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next month</span>
      </Button>
    </div>
  )
}
