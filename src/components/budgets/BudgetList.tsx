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

const ROW_COLS = 'auto 200px 1fr auto auto'

interface BudgetListProps {
  items: BudgetWithActual[]
  month: string
}

export function BudgetList({ items, month }: BudgetListProps) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {/* Header row — styled like a table header strip */}
      <div
        className="grid items-center gap-x-4 px-4 py-3 rounded-t-lg bg-muted/50"
        style={{ gridTemplateColumns: ROW_COLS }}
      >
        <span />
        <div>
          <p className="font-medium text-[13px] text-foreground">All categories</p>
          <p className="text-[11px] text-muted-foreground">Click a budget to edit</p>
        </div>
        <span />
        <span />
        <span />
      </div>

      {items.map(({ category, budget, actual_cents }) => {
        const budgetCents = budget?.amount_cents ?? 0
        const ratio = budgetCents > 0 ? actual_cents / budgetCents : 0
        const pct = Math.min(ratio * 100, 100)
        const isOver = ratio >= 1
        const isApproaching = ratio >= 0.8

        const indicatorClassName = isOver
          ? 'bg-destructive'
          : isApproaching
            ? 'bg-warning'
            : 'bg-success'

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
          <div
            key={category.id}
            className="grid items-center gap-x-4 px-4 py-3.5 last:rounded-b-lg hover:bg-muted/30 transition-colors"
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

            {/* edit dialog */}
            <SetBudgetDialog
              categoryId={category.id}
              categoryName={category.name}
              month={month}
              existing={budget}
            />

            {/* percentage — always shown as a badge when a budget exists */}
            {budget ? (
              <Badge variant={pctBadgeVariant} className="font-mono tabular-nums justify-center">
                {Math.round(ratio * 100)}%
              </Badge>
            ) : (
              <span />
            )}
          </div>
        )
      })}
    </div>
  )
}
