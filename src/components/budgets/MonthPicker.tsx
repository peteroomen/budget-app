'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

function formatMonthLabel(month: string): string {
  const parts = month.split('-')
  const date = new Date(parseInt(parts[0]!), parseInt(parts[1]!) - 1, 1)
  return date.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })
}

function offsetMonth(month: string, delta: number): string {
  const parts = month.split('-').map(Number)
  const year = parts[0]!
  const m = parts[1]!
  const date = new Date(year, m - 1 + delta, 1)
  const newYear = date.getFullYear()
  const newMonth = String(date.getMonth() + 1).padStart(2, '0')
  return `${newYear}-${newMonth}`
}

interface MonthPickerProps {
  month: string
}

export function MonthPicker({ month }: MonthPickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigate(delta: number) {
    const next = offsetMonth(month, delta)
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', next)
    router.push(`/budgets?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate(-1)} aria-label="Previous month">
        ‹
      </Button>
      <span className="min-w-[10rem] text-center text-sm font-medium">
        {formatMonthLabel(month)}
      </span>
      <Button variant="outline" size="sm" onClick={() => navigate(1)} aria-label="Next month">
        ›
      </Button>
    </div>
  )
}
