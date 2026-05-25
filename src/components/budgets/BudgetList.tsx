'use client'

import { useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { SetBudgetDialog } from '@/components/budgets/SetBudgetDialog'
import type { BudgetWithActual } from '@/lib/queries/budgets'
import type { BadgeProps } from '@/components/ui/badge'

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatNZD(cents: number): string {
  return nzd.format(cents / 100)
}

const ROW_COLS = 'auto 200px 1fr auto'

interface BudgetListProps {
  items: BudgetWithActual[]
  month: string
}

function BudgetRow({ item, month }: { item: BudgetWithActual; month: string }) {
  const [open, setOpen] = useState(false)
  const { category, budget, actual_cents } = item
  const budgetCents = budget?.amount_cents ?? 0
  const ratio = budgetCents > 0 ? actual_cents / budgetCents : 0
  const pct = Math.min(ratio * 100, 100)
  const isOver = ratio >= 1
  const isApproaching = ratio >= 0.8

  const indicatorClassName = isOver ? 'bg-destructive' : isApproaching ? 'bg-warning' : 'bg-success'

  const pctBadgeVariant: BadgeProps['variant'] = isOver
    ? 'danger'
    : isApproaching
      ? 'warn'
      : 'outline'

  const leftOrOver = budget
    ? isOver
      ? { amount: formatNZD(actual_cents - budgetCents), label: 'over', over: true }
      : { amount: formatNZD(budgetCents - actual_cents), label: 'left', over: false }
    : null

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(true)}
        className="grid cursor-pointer items-center gap-x-4 px-4 py-3.5 last:rounded-b-lg hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:bg-muted/30"
        style={{ gridTemplateColumns: ROW_COLS }}
      >
        {/* dot */}
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: category.color ?? 'hsl(var(--primary))' }}
        />

        {/* name + subtitle */}
        <div className="min-w-0">
          <p className="font-medium text-[13.5px] truncate">{category.name}</p>
          <p className="text-[11.5px] font-mono tabular-nums text-muted-foreground truncate mt-0.5">
            {formatNZD(actual_cents)} spent
            {leftOrOver && (
              <>
                {' · '}
                <span className={leftOrOver.over ? 'text-destructive' : ''}>
                  {leftOrOver.amount} {leftOrOver.label}
                </span>
              </>
            )}
          </p>
        </div>

        {/* progress bar */}
        <div className="min-w-0">
          {budget ? (
            <Progress value={pct} className="h-1.5" indicatorClassName={indicatorClassName} />
          ) : (
            <span className="text-[11px] text-muted-foreground">No budget set</span>
          )}
        </div>

        {/* percentage badge */}
        {budget ? (
          <Badge variant={pctBadgeVariant} className="font-mono tabular-nums justify-center">
            {Math.round(ratio * 100)}%
          </Badge>
        ) : (
          <span />
        )}
      </div>

      <SetBudgetDialog
        categoryId={category.id}
        categoryName={category.name}
        month={month}
        existing={budget}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

export function BudgetList({ items, month }: BudgetListProps) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {/* Header row — same background as data rows */}
      <div
        className="grid items-center gap-x-4 px-4 py-3 rounded-t-lg"
        style={{ gridTemplateColumns: ROW_COLS }}
      >
        <span />
        <div>
          <p className="font-medium text-[13px] text-foreground">All categories</p>
          <p className="text-[11px] text-muted-foreground">Click a budget to edit</p>
        </div>
        <span />
        <span />
      </div>

      {items.map((item) => (
        <BudgetRow key={item.category.id} item={item} month={month} />
      ))}
    </div>
  )
}
