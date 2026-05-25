'use client'

import { useState } from 'react'
import { Info, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface SeededFromBannerProps {
  sourceMonth: string // YYYY-MM
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return new Date(year!, m! - 1, 1).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })
}

export function SeededFromBanner({ sourceMonth }: SeededFromBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <Alert className="flex items-start justify-between gap-2 border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="flex-1">
        Budgets auto-copied from{' '}
        <span className="font-medium">{formatMonthLabel(sourceMonth)}</span>. Edit any amount to
        override for this month.
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-blue-600 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-900"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </Alert>
  )
}
