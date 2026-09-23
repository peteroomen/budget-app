'use client'

import { toast } from 'sonner'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { recategoriseAll } from '@/lib/actions/categorise'

export function RecategoriseButton() {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await recategoriseAll()
        if (result.error) toast.error(result.error)
        else toast.success('Categories updated; manual choices preserved.')
      } catch {
        toast.error('Unable to complete this update. Please retry.')
      }
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? 'Re-categorising…' : 'Re-categorise all'}
    </Button>
  )
}
