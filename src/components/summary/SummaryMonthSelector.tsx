'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { prevMonth, nextMonth, formatMonthLabel, currentMonth } from '@/lib/utils/month'

interface SummaryMonthSelectorProps {
  month: string
  isAdmin?: boolean
}

export function SummaryMonthSelector({ month, isAdmin }: SummaryMonthSelectorProps) {
  const router = useRouter()
  const now = currentMonth()
  const isCurrentMonth = month === now

  function navigate(target: string) {
    router.push(`/summary?month=${target}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => navigate(prevMonth(month))}>
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous month</span>
      </Button>
      <span className="min-w-[140px] text-center text-sm font-medium">
        {formatMonthLabel(month)}
      </span>
      <Button
        variant="outline"
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
