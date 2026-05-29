'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MonthJumpPopover } from '@/components/ui/month-jump-popover'
import { prevMonth, nextMonth } from '@/lib/utils/month'

interface MonthPickerProps {
  month: string
  /** Base path to navigate on month change. Defaults to '/budgets'. */
  basePath?: string
}

export function MonthPicker({ month, basePath = '/budgets' }: MonthPickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigate(target: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', target)
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <div className="inline-flex items-center rounded-lg border bg-background">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(prevMonth(month))}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <MonthJumpPopover selectedMonth={month} onSelect={navigate} />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(nextMonth(month))}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
