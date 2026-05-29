'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { currentMonth, formatMonthLabel } from '@/lib/utils/month'

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

interface MonthJumpPopoverProps {
  selectedMonth: string
  onSelect: (month: string) => void
  allowFuture?: boolean
}

export function MonthJumpPopover({
  selectedMonth,
  onSelect,
  allowFuture = false,
}: MonthJumpPopoverProps) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => parseInt(selectedMonth.slice(0, 4), 10))

  const now = currentMonth()
  const nowYear = parseInt(now.slice(0, 4), 10)
  const nowMonthNum = parseInt(now.slice(5, 7), 10)

  function handleOpenChange(next: boolean) {
    if (next) setViewYear(parseInt(selectedMonth.slice(0, 4), 10))
    setOpen(next)
  }

  function handleSelect(monthIdx: number) {
    const m = String(monthIdx + 1).padStart(2, '0')
    onSelect(`${viewYear}-${m}`)
    setOpen(false)
  }

  function isDisabled(monthIdx: number): boolean {
    if (allowFuture) return false
    if (viewYear > nowYear) return true
    if (viewYear === nowYear && monthIdx + 1 > nowMonthNum) return true
    return false
  }

  function isSelected(monthIdx: number): boolean {
    const m = String(monthIdx + 1).padStart(2, '0')
    return selectedMonth === `${viewYear}-${m}`
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="inline-flex min-w-[140px] cursor-pointer items-center justify-center gap-1.5 text-center text-sm font-medium transition-colors hover:text-primary">
          {formatMonthLabel(selectedMonth)}
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3">
        <div className="mb-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous year</span>
          </Button>
          <span className="text-sm font-semibold">{viewYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewYear((y) => y + 1)}
            disabled={!allowFuture && viewYear >= nowYear}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next year</span>
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTH_LABELS.map((label, idx) => {
            const disabled = isDisabled(idx)
            const selected = isSelected(idx)
            return (
              <button
                key={label}
                onClick={() => !disabled && handleSelect(idx)}
                disabled={disabled}
                className={cn(
                  'rounded-md py-1.5 text-xs font-medium transition-colors',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : disabled
                      ? 'cursor-not-allowed text-muted-foreground/40'
                      : 'cursor-pointer hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
