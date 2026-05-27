'use client'

import { useEffect, useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { setTransactionNote } from '@/lib/actions/transactions'
import { cn } from '@/lib/utils'

interface Props {
  transactionId: string
  merchantLabel: string
  initialNote: string | null
  variant?: 'desktop' | 'mobile'
  triggerClassName?: string
}

export function NotePopover({
  transactionId,
  merchantLabel,
  initialNote,
  variant = 'desktop',
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(initialNote ?? '')
  const [isPending, startTransition] = useTransition()

  // Re-sync input when the popover opens or the underlying note changes on the server.
  useEffect(() => {
    if (open) setValue(initialNote ?? '')
  }, [open, initialNote])

  function handleSave() {
    startTransition(async () => {
      const result = await setTransactionNote(transactionId, value)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setOpen(false)
      toast.success(value.trim().length === 0 ? 'Note cleared' : 'Note saved')
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  const iconSize = variant === 'mobile' ? 'h-4 w-4' : 'h-3.5 w-3.5'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            initialNote ? `Edit note for ${merchantLabel}` : `Add note to ${merchantLabel}`
          }
          className={cn(
            'inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            variant === 'mobile' ? 'h-7 w-7' : 'h-6 w-6',
            triggerClassName
          )}
        >
          <Pencil className={iconSize} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4px] font-medium text-muted-foreground">
            Note for
          </p>
          <p className="text-sm font-medium truncate">{merchantLabel}</p>
        </div>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
          placeholder="e.g. normal — dog vet, every 3 months"
          disabled={isPending}
        />
        <p className="text-label text-muted-foreground">Leave empty to clear.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
