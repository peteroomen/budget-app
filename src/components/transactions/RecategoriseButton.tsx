'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { recategoriseAll } from '@/lib/actions/categorise'

export function RecategoriseButton() {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await recategoriseAll()
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? 'Re-categorising…' : 'Re-categorise all'}
    </Button>
  )
}
