'use client'

import { Pencil } from 'lucide-react'

interface Props {
  isManual: boolean
}

/**
 * Display-only pill chip shown below the merchant name when a transaction's
 * category was manually overridden (category_source === 'manual').
 * Returns null when isManual is false — nothing rendered.
 */
export function ManualBadge({ isManual }: Props) {
  if (!isManual) return null

  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none bg-muted text-muted-foreground ring-1 ring-inset ring-border">
      <Pencil className="h-2.5 w-2.5" />
      Manual
    </span>
  )
}
