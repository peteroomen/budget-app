'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { upsertBudget } from '@/lib/actions/budgets'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Budget } from '@/types'

interface SetBudgetDialogProps {
  categoryId: string
  categoryName: string
  month: string
  existing: Budget | null
  /** If provided, the dialog is externally controlled and no trigger button is rendered */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SetBudgetDialog({
  categoryId,
  categoryName,
  month,
  existing,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: SetBudgetDialogProps) {
  const controlled = openProp !== undefined
  const [openInternal, setOpenInternal] = useState(false)
  const open = controlled ? openProp : openInternal
  const [amountError, setAmountError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [state, action, pending] = useActionState(upsertBudget, { error: null })
  const submitted = useRef(false)

  const defaultAmount = existing !== null ? (existing.amount_cents / 100).toFixed(2) : ''

  useEffect(() => {
    if (!pending && submitted.current) {
      if (state.error === null) {
        handleOpenChange(false)
        setFormKey((k) => k + 1)
        submitted.current = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state])

  function handleOpenChange(next: boolean) {
    if (controlled) {
      onOpenChangeProp?.(next)
    } else {
      setOpenInternal(next)
    }
    if (!next) {
      setAmountError(null)
      setFormKey((k) => k + 1)
      submitted.current = false
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!controlled && (
        <DialogTrigger asChild>
          <Button variant={existing ? 'outline' : 'ghost'} size="sm">
            {existing ? 'Edit' : 'Set budget'}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {existing ? 'Edit budget' : 'Set budget'} — {categoryName}
          </DialogTitle>
        </DialogHeader>
        <form
          key={formKey}
          action={(formData) => {
            const raw = formData.get('amount_display')
            const parsed = typeof raw === 'string' ? parseFloat(raw) : NaN
            if (isNaN(parsed) || parsed < 0) {
              setAmountError('Enter a valid amount')
              return
            }
            const cents = Math.round(parsed * 100)
            formData.set('amount_cents', String(cents))
            setAmountError(null)
            submitted.current = true
            action(formData)
          }}
          className="space-y-4 pt-2"
        >
          <input type="hidden" name="category_id" value={categoryId} />
          <input type="hidden" name="month" value={month} />

          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Monthly budget (NZD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="budget-amount"
                name="amount_display"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                defaultValue={defaultAmount}
                className="pl-7"
              />
            </div>
            {amountError && <p className="text-sm text-destructive">{amountError}</p>}
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
