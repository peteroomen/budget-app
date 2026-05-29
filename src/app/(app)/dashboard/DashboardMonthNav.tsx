'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MonthJumpPopover } from '@/components/ui/month-jump-popover'
import { prevMonth, nextMonth, currentMonth } from '@/lib/utils/month'

interface DashboardMonthNavProps {
  month: string
  isAdmin?: boolean
}

export function DashboardMonthNav({ month, isAdmin }: DashboardMonthNavProps) {
  const router = useRouter()
  const isCurrentMonth = month === currentMonth()

  function navigate(target: string) {
    router.push(`/dashboard?month=${target}`)
  }

  return (
    <div className="-ml-2 flex items-center gap-0.5">
      <Button variant="ghost" size="icon" onClick={() => navigate(prevMonth(month))}>
        <ChevronLeft className="h-5 w-5" />
        <span className="sr-only">Previous month</span>
      </Button>
      <MonthJumpPopover
        selectedMonth={month}
        onSelect={navigate}
        allowFuture={!!isAdmin}
        triggerClassName="font-display text-display-h1 font-medium px-1"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(nextMonth(month))}
        disabled={isCurrentMonth && !isAdmin}
      >
        <ChevronRight className="h-5 w-5" />
        <span className="sr-only">Next month</span>
      </Button>
    </div>
  )
}
