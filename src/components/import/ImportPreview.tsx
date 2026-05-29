'use client'

import { Button } from '@/components/ui/button'
import type { ImportStats } from '@/lib/types/import'

interface ImportPreviewProps {
  stats: ImportStats
  format: string
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
}

const STAT_TILES = [
  { key: 'newCount', label: 'New transactions' },
  { key: 'duplicates', label: 'Duplicates skipped' },
  { key: 'fromMap', label: 'From memory' },
  { key: 'fromClaude', label: 'From Claude' },
  { key: 'uncategorised', label: 'Uncategorised' },
] as const

export function ImportPreview({ stats, format, pending, onConfirm, onCancel }: ImportPreviewProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="font-display text-display-h2 font-medium">Ready to import</p>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Format detected: <span className="font-medium text-foreground">{format}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {STAT_TILES.map(({ key, label }) => (
          <div key={key} className="rounded-lg border border-border p-3 text-center">
            <p className="font-display text-display-metric font-medium tabular-nums">
              {stats[key]}
            </p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={onConfirm} disabled={pending}>
          {pending ? 'Importing…' : 'Confirm Import'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
