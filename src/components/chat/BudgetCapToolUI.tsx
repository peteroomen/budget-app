'use client'

import { useEffect, useRef } from 'react'
import type { ToolCallMessagePartProps } from '@assistant-ui/react'
import { upsertBudget, deleteBudget } from '@/lib/actions/budgets'
import type {
  SetBudgetCapArgs,
  ClearBudgetCapArgs,
  BudgetCapToolResult,
} from '@/lib/ai/budget-tool-contract'
import { useBudgetCategory } from './budget-categories-context'
import { BudgetCapCard, formatCents } from './BudgetCapCard'

type Props<TArgs> = ToolCallMessagePartProps<Partial<TArgs>, unknown>

/** Narrows the settled tool result to the shape this UI writes; anything else is foreign. */
function asSettled(result: unknown): BudgetCapToolResult | undefined {
  if (result === undefined || result === null) return undefined
  const r = result as Partial<BudgetCapToolResult> & { error?: unknown }
  if (r.status === 'applied' || r.status === 'declined' || r.status === 'error') {
    return { status: r.status, message: String(r.message ?? '') }
  }
  return { status: 'error', message: typeof r.error === 'string' ? r.error : 'Not applied.' }
}

function Pending() {
  return <p className="my-2 text-body-xs text-muted-foreground">Preparing a budget change…</p>
}

/**
 * Rendered when the proposed id isn't in the server-fetched category list. There is no
 * "Apply" here at all — the failure is reported straight back to the model so it can tell
 * the user, and the run doesn't hang on an unanswered tool call.
 */
function UnknownCategory({
  settled,
  addResult,
}: {
  settled: BudgetCapToolResult | undefined
  addResult: (result: BudgetCapToolResult) => void
}) {
  const reported = useRef(false)
  useEffect(() => {
    if (settled || reported.current) return
    reported.current = true
    addResult({
      status: 'error',
      message:
        'That category id is not in the list you were given, so nothing was changed. ' +
        'Tell the user which categories are available instead of retrying.',
    })
  }, [settled, addResult])

  if (settled) return null
  return (
    <p className="my-2 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-body-xs text-muted-foreground">
      Tide suggested a change to a category that doesn&apos;t exist. Nothing was changed.
    </p>
  )
}

export function SetBudgetCapToolUI({ args, status, result, addResult }: Props<SetBudgetCapArgs>) {
  const settled = asSettled(result)
  const category = useBudgetCategory(args?.categoryId)
  const amountCents = args?.amountCents

  if (!settled && (status.type === 'running' || typeof amountCents !== 'number')) return <Pending />
  if (!category) return <UnknownCategory settled={settled} addResult={addResult} />

  const target = amountCents ?? 0
  const current =
    category.capCents === null ? 'no cap set' : `currently ${formatCents(category.capCents)}`

  return (
    <BudgetCapCard
      headline={`Set ${category.name} to ${formatCents(target)} a month`}
      detail={`${current} · caps are standing values and apply to every month`}
      confirmLabel="Set cap"
      settled={settled}
      onSettled={addResult}
      apply={async () => {
        // The write happens here — on the click, never in the tool. `upsertBudget` re-derives
        // household_id from the session, so the model's proposal cannot widen its own scope.
        const form = new FormData()
        form.set('category_id', category.id)
        form.set('amount_cents', String(target))
        return upsertBudget({ error: null }, form)
      }}
    />
  )
}

export function ClearBudgetCapToolUI({
  args,
  status,
  result,
  addResult,
}: Props<ClearBudgetCapArgs>) {
  const settled = asSettled(result)
  const category = useBudgetCategory(args?.categoryId)

  if (!settled && status.type === 'running') return <Pending />
  if (!category) return <UnknownCategory settled={settled} addResult={addResult} />

  return (
    <BudgetCapCard
      headline={`Remove the cap on ${category.name}`}
      detail={
        category.capCents === null
          ? 'This category has no cap set, so nothing will change.'
          : `Its cap of ${formatCents(category.capCents)} will be removed and the category left uncapped.`
      }
      confirmLabel="Remove cap"
      settled={settled}
      onSettled={addResult}
      apply={() => deleteBudget(category.id)}
    />
  )
}
