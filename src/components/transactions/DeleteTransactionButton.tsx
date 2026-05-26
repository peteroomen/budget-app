'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { deleteTransaction } from '@/lib/actions/transactions'
import { cn } from '@/lib/utils'

interface Props {
  transactionId: string
  label: string
  variant?: 'desktop' | 'mobile'
  triggerClassName?: string
}

export function DeleteTransactionButton({
  transactionId,
  label,
  variant = 'desktop',
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteTransaction(transactionId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setOpen(false)
      toast.success('Transaction deleted')
    })
  }

  const iconSize = variant === 'mobile' ? 'h-4 w-4' : 'h-3.5 w-3.5'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Delete ${label}`}
          className={cn(
            'inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            variant === 'mobile' ? 'h-9 w-9' : 'h-7 w-7',
            triggerClassName
          )}
        >
          <Trash2 className={iconSize} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete transaction?</DialogTitle>
          <DialogDescription>
            This will permanently remove{' '}
            <span className="font-medium text-foreground">{label}</span> from your transactions.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
