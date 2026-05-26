'use client'

import { useState } from 'react'
import { Info, X } from 'lucide-react'
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
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
      <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="flex-1 text-sm text-foreground">
        <strong>Seeded from {formatMonthLabel(sourceMonth)}.</strong> Edit any category to tune for
        this month.
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
