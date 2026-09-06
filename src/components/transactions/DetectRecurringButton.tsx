'use client'

import { toast } from 'sonner'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { detectRecurring } from '@/lib/actions/recurring'

export function DetectRecurringButton() {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await detectRecurring()
        if (result.error) toast.error(result.error)
        else toast.success('Recurring flags updated; manual choices preserved.')
      } catch {
        toast.error('Unable to complete this update. Please retry.')
      }
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? 'Detecting…' : 'Detect recurring'}
    </Button>
  )
}
