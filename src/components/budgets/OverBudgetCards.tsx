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

interface OverBudgetCardsProps {
  items: BudgetWithActual[]
}

export function OverBudgetCards({ items }: OverBudgetCardsProps) {
  const overBudget = items.filter(
    (item) => item.budget !== null && item.actual_cents > item.budget.amount_cents
  )

  if (overBudget.length === 0) return null

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
      <div className="mb-4">
        <h2 className="font-medium text-destructive">{overBudget.length} over budget</h2>
        <p className="text-sm text-muted-foreground">
          You&apos;ve stretched these categories past their cap.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {overBudget.map(({ category, budget, actual_cents }) => {
          const budgetCents = budget?.amount_cents ?? 0
          const overBy = actual_cents - budgetCents
          const ratio = budgetCents > 0 ? actual_cents / budgetCents : 0
          const pct = Math.round(ratio * 100)

          return (
            <div
              key={category.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color ?? 'hsl(var(--primary))' }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[13px]">{category.name}</p>
                <p className="mt-0.5 font-mono text-[11.5px] tabular-nums">
                  <span className="text-muted-foreground">
                    {formatNZD(actual_cents)} of {formatNZD(budgetCents)} —{' '}
                  </span>
                  <span className="text-destructive">{formatNZD(overBy)} over</span>
                </p>
              </div>
              <span className="font-mono text-[12px] font-semibold text-destructive tabular-nums shrink-0">
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
