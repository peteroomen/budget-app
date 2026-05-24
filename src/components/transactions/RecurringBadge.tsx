'use client'

import { useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleRecurring } from '@/lib/actions/recurring'

interface Props {
  transactionId: string
  isRecurring: boolean
}

export function RecurringBadge({ transactionId, isRecurring }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await toggleRecurring(transactionId, !isRecurring)
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-7 w-7 ${isRecurring ? 'text-blue-600 hover:text-blue-700' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
      onClick={handleClick}
      disabled={isPending}
      title={isRecurring ? 'Recurring — click to unmark' : 'Mark as recurring'}
    >
      <RefreshCw className="h-3.5 w-3.5" />
    </Button>
  )
}
