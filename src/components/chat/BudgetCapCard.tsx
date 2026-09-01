'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { CheckCircle2, PiggyBank, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { BudgetCapToolResult } from '@/lib/ai/budget-tool-contract'

const nzd = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' })

export function formatCents(cents: number): string {
  return nzd.format(cents / 100)
}

/**
 * The confirmation card the model's budget-cap proposals render as.
 *
 * Nothing has been written when this appears — the tool that produced it has no `execute`,
 * so the model can only ever get as far as putting this card on screen. `apply` runs on
 * click and nowhere else.
 */
export function BudgetCapCard({
  headline,
  detail,
  confirmLabel,
  apply,
  settled,
  onSettled,
}: {
  headline: string
  detail?: ReactNode
  confirmLabel: string
  apply: () => Promise<{ error: string | null }>
  settled: BudgetCapToolResult | undefined
  onSettled: (result: BudgetCapToolResult) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [inlineError, setInlineError] = useState<string | null>(null)

  if (settled) return <SettledCard result={settled} headline={headline} />

  function handleApply() {
    setInlineError(null)
    startTransition(async () => {
      const { error } = await apply()
      if (error) {
        setInlineError(error)
        toast.error('Could not update the budget', { description: error })
        onSettled({ status: 'error', message: `The change was not applied: ${error}` })
        return
      }
      toast.success(headline)
      onSettled({ status: 'applied', message: `The user approved this change and it was saved.` })
    })
  }

  return (
    <div className="my-2 rounded-xl border border-border bg-muted/40 p-3.5">
      <div className="flex items-start gap-2.5">
        <PiggyBank className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium text-foreground">{headline}</p>
          {detail ? <p className="mt-0.5 text-body-xs text-muted-foreground">{detail}</p> : null}
          {inlineError ? <p className="mt-1 text-body-xs text-destructive">{inlineError}</p> : null}
          <div className="mt-2.5 flex gap-2">
            <Button size="sm" onClick={handleApply} disabled={isPending}>
              {isPending ? 'Saving…' : confirmLabel}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                onSettled({ status: 'declined', message: 'The user declined this change.' })
              }
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettledCard({ result, headline }: { result: BudgetCapToolResult; headline: string }) {
  const applied = result.status === 'applied'
  const Icon = applied ? CheckCircle2 : XCircle
  const label = applied
    ? headline
    : result.status === 'declined'
      ? 'Dismissed — nothing was changed'
      : result.message

  return (
    <div className="my-2 flex items-center gap-2 rounded-xl border border-border bg-muted/25 px-3.5 py-2.5">
      <Icon className={`h-4 w-4 shrink-0 ${applied ? 'text-primary' : 'text-muted-foreground'}`} />
      <p className="text-body-xs text-muted-foreground">{applied ? `Saved · ${label}` : label}</p>
    </div>
  )
}
