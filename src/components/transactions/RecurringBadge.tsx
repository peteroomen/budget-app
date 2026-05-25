'use client'

import { useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { toggleRecurring } from '@/lib/actions/recurring'

interface Props {
  transactionId: string
  isRecurring: boolean
}

/**
 * Pill chip shown below the merchant name for recurring transactions.
 * Clicking it toggles the recurring flag (marks as one-off).
 * Returns null when isRecurring is false — nothing rendered.
 */
export function RecurringBadge({ transactionId, isRecurring }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await toggleRecurring(transactionId, !isRecurring)
    })
  }

  if (!isRecurring) return null

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title="Recurring expense — click to mark as one-off"
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50 cursor-pointer"
    >
      <RefreshCw className="h-2.5 w-2.5" />
      Recurring
    </button>
  )
}
