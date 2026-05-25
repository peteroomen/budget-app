import { Card, CardContent } from '@/components/ui/card'
import { SetBudgetDialog } from '@/components/budgets/SetBudgetDialog'
import {
  BudgetProgressBar,
  PacingBadge,
  getPacingLabel,
} from '@/components/budgets/BudgetProgressBar'
import type { BudgetWithActual } from '@/lib/queries/budgets'

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatNZD(cents: number): string {
  return nzd.format(cents / 100)
}

interface BudgetCardProps {
  item: BudgetWithActual
  month: string
}

export function BudgetCard({ item, month }: BudgetCardProps) {
  const { category, budget, actual_cents } = item
  const budgetCents = budget?.amount_cents ?? 0
  const ratio = budgetCents > 0 ? actual_cents / budgetCents : 0

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        {/* Header row: category + pacing badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: category.color ?? 'hsl(var(--primary))' }}
            />
            <span className="font-medium text-display-card-title truncate">{category.name}</span>
          </div>
          {budget && <PacingBadge ratio={ratio} />}
        </div>

        {/* Hero metric */}
        <div>
          <p className="font-display text-display-metric font-medium tabular-nums leading-none">
            {formatNZD(actual_cents)}
            {/* text-[15px] — intentional one-off between display-metric (22px) and display-card-title (14px) */}
            {budget && (
              <span className="text-[15px] font-normal text-muted-foreground">
                {' '}
                of {formatNZD(budgetCents)}
              </span>
            )}
          </p>
        </div>

        {/* Progress bar */}
        {budget && <BudgetProgressBar actual_cents={actual_cents} budget_cents={budgetCents} />}

        {/* Bottom row: pacing text + edit button */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-label text-muted-foreground">
            {budget
              ? ratio >= 1
                ? `${formatNZD(actual_cents - budgetCents)} over`
                : getPacingLabel(ratio)
              : 'No budget set'}
          </p>
          <SetBudgetDialog
            categoryId={category.id}
            categoryName={category.name}
            month={month}
            existing={budget}
          />
        </div>
      </CardContent>
    </Card>
  )
}
