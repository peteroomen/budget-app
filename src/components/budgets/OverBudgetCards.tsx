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
      <h2 className="text-sm font-medium text-destructive">Over budget</h2>
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
                  style={{ backgroundColor: category.color ?? '#6b7280' }}
                />
                <span className="font-medium">{category.name}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Spent <span className="font-medium text-foreground">{formatNZD(actual_cents)}</span>{' '}
                of {formatNZD(budget?.amount_cents ?? 0)} budget
              </p>
              <p className="text-sm font-medium text-destructive">{formatNZD(overBy)} over</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
