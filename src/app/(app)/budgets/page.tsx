import { Suspense } from 'react'
import { getBudgetsWithActuals } from '@/lib/queries/budgets'
import { MonthPicker } from '@/components/budgets/MonthPicker'
import { BudgetProgressBar } from '@/components/budgets/BudgetProgressBar'
import { SetBudgetDialog } from '@/components/budgets/SetBudgetDialog'
import { OverBudgetCards } from '@/components/budgets/OverBudgetCards'

function currentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function formatNZD(cents: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(cents / 100)
}

function isValidMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value)
}

interface BudgetsPageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const params = await searchParams
  const month =
    typeof params.month === 'string' && isValidMonth(params.month) ? params.month : currentMonth()

  const items = await getBudgetsWithActuals(month)

  const hasAnyBudget = items.some((item) => item.budget !== null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Budgets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set and track monthly spending limits per category.
          </p>
        </div>
        <Suspense fallback={null}>
          <MonthPicker month={month} />
        </Suspense>
      </div>

      <OverBudgetCards items={items} />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories found. Add some categories first.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actual</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Budget</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[12rem]">
                  Progress
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ category, budget, actual_cents }) => (
                <tr key={category.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: category.color ?? '#6b7280' }}
                      />
                      <span className="font-medium">{category.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {actual_cents > 0 ? (
                      <span
                        className={
                          budget && actual_cents > budget.amount_cents
                            ? 'text-destructive font-medium'
                            : ''
                        }
                      >
                        {formatNZD(actual_cents)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {budget ? (
                      formatNZD(budget.amount_cents)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 min-w-[12rem]">
                    {budget ? (
                      <BudgetProgressBar
                        actual_cents={actual_cents}
                        budget_cents={budget.amount_cents}
                      />
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SetBudgetDialog
                      categoryId={category.id}
                      categoryName={category.name}
                      month={month}
                      existing={budget}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!hasAnyBudget && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No budgets set for this month. Click <strong>Set budget</strong> on any category to
              get started.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
