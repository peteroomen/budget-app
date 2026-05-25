import { Progress } from '@/components/ui/progress'
import { SetBudgetDialog } from '@/components/budgets/SetBudgetDialog'
import { PacingBadge } from '@/components/budgets/BudgetProgressBar'
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

interface BudgetTableProps {
  items: BudgetWithActual[]
  month: string
  className?: string
}

export function BudgetTable({ items, month, className }: BudgetTableProps) {
  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-label-caps uppercase tracking-[0.05em] text-muted-foreground font-medium">
                Category
              </th>
              <th className="px-4 py-3 text-right text-label-caps uppercase tracking-[0.05em] text-muted-foreground font-medium">
                Spent
              </th>
              <th className="px-4 py-3 text-right text-label-caps uppercase tracking-[0.05em] text-muted-foreground font-medium">
                Budget
              </th>
              <th className="px-4 py-3 text-left text-label-caps uppercase tracking-[0.05em] text-muted-foreground font-medium min-w-[10rem]">
                Progress
              </th>
              <th className="px-4 py-3 text-right text-label-caps uppercase tracking-[0.05em] text-muted-foreground font-medium sr-only">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ category, budget, actual_cents }) => {
              const budgetCents = budget?.amount_cents ?? 0
              const ratio = budgetCents > 0 ? actual_cents / budgetCents : 0
              const pct = Math.min(ratio * 100, 100)
              const indicatorClassName =
                ratio >= 1 ? 'bg-destructive' : ratio >= 0.8 ? 'bg-warning' : 'bg-primary'

              return (
                <tr
                  key={category.id}
                  className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                >
                  {/* Category */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color ?? 'hsl(var(--primary))' }}
                      />
                      <span className="font-medium text-display-card-title truncate">
                        {category.name}
                      </span>
                      {budget && (
                        <span className="hidden sm:block">
                          <PacingBadge ratio={ratio} />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Spent */}
                  <td className="px-4 py-3.5 text-right">
                    {actual_cents > 0 ? (
                      <span
                        className={`font-mono text-body-sm tabular-nums ${
                          budget && actual_cents > budgetCents
                            ? 'text-destructive font-medium'
                            : 'text-foreground'
                        }`}
                      >
                        {formatNZD(actual_cents)}
                      </span>
                    ) : (
                      <span className="font-mono text-body-sm text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Budget */}
                  <td className="px-4 py-3.5 text-right">
                    {budget ? (
                      <span className="font-mono text-body-sm tabular-nums text-muted-foreground">
                        {formatNZD(budgetCents)}
                      </span>
                    ) : (
                      <span className="font-mono text-body-sm text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Progress */}
                  <td className="px-4 py-3.5 min-w-[10rem]">
                    {budget ? (
                      <div className="space-y-1">
                        <Progress
                          value={pct}
                          className="h-1.5"
                          indicatorClassName={indicatorClassName}
                        />
                        <p className="text-label text-muted-foreground">
                          {ratio >= 1
                            ? `${Math.round((ratio - 1) * 100)}% over`
                            : `${Math.round(ratio * 100)}%`}
                        </p>
                      </div>
                    ) : (
                      <span className="text-label text-muted-foreground">No budget set</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right">
                    <SetBudgetDialog
                      categoryId={category.id}
                      categoryName={category.name}
                      month={month}
                      existing={budget}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
