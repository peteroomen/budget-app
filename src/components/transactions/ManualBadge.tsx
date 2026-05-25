'use client'

import { Pencil } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  isManual: boolean
}

export function ManualBadge({ isManual }: Props) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center ${
              isManual ? 'text-blue-600' : 'text-transparent'
            }`}
          >
            <Pencil className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        {isManual && <TooltipContent side="top">Category manually overridden</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  )
}
