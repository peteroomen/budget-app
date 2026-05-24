'use client'

import { useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 shrink-0 ${
              isRecurring
                ? 'text-blue-600 hover:text-blue-700'
                : 'text-transparent group-hover:text-muted-foreground/50 hover:!text-muted-foreground'
            }`}
            onClick={handleClick}
            disabled={isPending}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isRecurring ? 'Recurring fixed cost — click to unmark' : 'Mark as recurring fixed cost'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
