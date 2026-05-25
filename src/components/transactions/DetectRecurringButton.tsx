'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { detectRecurring } from '@/lib/actions/recurring'

export function DetectRecurringButton() {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await detectRecurring()
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? 'Detecting…' : 'Detect recurring'}
    </Button>
  )
}
