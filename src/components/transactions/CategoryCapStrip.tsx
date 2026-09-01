import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { BadgeProps } from '@/components/ui/badge'
import type { Budget, Category } from '@/types'

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatNZD(cents: number): string {
  return nzd.format(cents / 100)
}

interface CategoryCapStripProps {
  category: Category
  budget: Budget
  /** Whole-month spend for this category — deliberately not the filtered subtotal. */
  actualCents: number
  /** Already-formatted month label, e.g. "September 2026". */
  monthLabel: string
}

/**
 * Cap + progress for the single category the transactions list is filtered to.
 *
 * Thresholds and colours mirror `BudgetList` on the Budgets page so the two screens
 * tell the same story. The page renders this only when the category has a cap, so
 * there is no "no budget set" state here.
 */
export function CategoryCapStrip({
  category,
  budget,
  actualCents,
  monthLabel,
}: CategoryCapStripProps) {
  const budgetCents = budget.amount_cents
  const ratio = budgetCents > 0 ? actualCents / budgetCents : 0
  const pct = Math.min(ratio * 100, 100)
  const isOver = ratio >= 1
  const isApproaching = ratio >= 0.8

  const indicatorClassName = isOver ? 'bg-destructive' : isApproaching ? 'bg-warning' : 'bg-success'

  const badgeVariant: BadgeProps['variant'] = isOver ? 'danger' : isApproaching ? 'warn' : 'outline'

  const remainder = isOver
    ? { amount: formatNZD(actualCents - budgetCents), label: 'over' }
    : { amount: formatNZD(budgetCents - actualCents), label: 'left' }

  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: category.color ?? 'hsl(var(--primary))' }}
        />
        <p className="text-[13.5px] font-medium">{category.name}</p>
        <p className="font-mono text-[11.5px] tabular-nums text-muted-foreground">
          {formatNZD(actualCents)} of {formatNZD(budgetCents)} ·{' '}
          <span className={isOver ? 'text-destructive' : ''}>
            {remainder.amount} {remainder.label}
          </span>
        </p>
        <Badge variant={badgeVariant} className="ml-auto font-mono tabular-nums">
          {Math.round(ratio * 100)}%
        </Badge>
      </div>

      <Progress value={pct} className="mt-2.5 h-1.5" indicatorClassName={indicatorClassName} />

      <p className="mt-1.5 text-[11px] text-muted-foreground">
        All {category.name} spend in {monthLabel} — the filters above don&apos;t change this figure.
      </p>
    </div>
  )
}
