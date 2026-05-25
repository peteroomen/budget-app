import type { BudgetWithActual } from '@/lib/queries/budgets'

function formatNZD(cents: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(cents / 100)
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
    <div className="space-y-3">
      <h2 className="text-label-caps uppercase tracking-[0.05em] font-medium text-destructive">
        Over budget
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {overBudget.map(({ category, budget, actual_cents }) => {
          const overBy = actual_cents - (budget?.amount_cents ?? 0)
          return (
            <div
              key={category.id}
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: category.color ?? 'hsl(var(--primary))' }}
                />
                <span className="text-display-card-title font-medium">{category.name}</span>
              </div>
              <p className="mt-2 text-body-sm text-muted-foreground">
                Spent{' '}
                <span className="font-mono font-medium text-foreground tabular-nums">
                  {formatNZD(actual_cents)}
                </span>{' '}
                of{' '}
                <span className="font-mono tabular-nums">
                  {formatNZD(budget?.amount_cents ?? 0)}
                </span>
              </p>
              <p className="font-mono text-body-sm font-medium text-destructive tabular-nums">
                {formatNZD(overBy)} over
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
