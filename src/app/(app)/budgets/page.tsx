import { Suspense } from 'react'
import {
  getBudgetsWithActuals,
  findMostRecentBudgetMonth,
  seedBudgetsFromMonth,
} from '@/lib/queries/budgets'
import { Card, CardContent } from '@/components/ui/card'
import { MonthPicker } from '@/components/budgets/MonthPicker'
import { BudgetTable } from '@/components/budgets/BudgetTable'
import { BudgetCard } from '@/components/budgets/BudgetCard'
import { OverBudgetCards } from '@/components/budgets/OverBudgetCards'
import { SeededFromBanner } from '@/components/budgets/SeededFromBanner'

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatNZD(cents: number) {
  return nzd.format(cents / 100)
}

function currentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
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

  let items = await getBudgetsWithActuals(month)
  let seededFrom: string | null = null

  if (!items.some((item) => item.budget !== null)) {
    const sourceMonth = await findMostRecentBudgetMonth(month)
    if (sourceMonth) {
      await seedBudgetsFromMonth(sourceMonth, month)
      items = await getBudgetsWithActuals(month)
      seededFrom = sourceMonth
    }
  }

  // KPI totals
  const totalBudget = items.reduce((s, i) => s + (i.budget?.amount_cents ?? 0), 0)
  const totalSpent = items.reduce((s, i) => s + i.actual_cents, 0)
  const remaining = Math.max(0, totalBudget - totalSpent)
  const overCount = items.filter((i) => i.budget && i.actual_cents > i.budget.amount_cents).length

  const kpis = [
    { label: 'Total budget', value: totalBudget > 0 ? formatNZD(totalBudget) : '—' },
    { label: 'Spent', value: formatNZD(totalSpent) },
    { label: 'Remaining', value: totalBudget > 0 ? formatNZD(remaining) : '—' },
    {
      label: 'Over budget',
      value: overCount.toString(),
      highlight: overCount > 0,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-h1 font-medium">Budgets</h1>
          <p className="mt-0.5 text-body-sm text-muted-foreground">
            Caps for the categories we care about.
          </p>
        </div>
        <Suspense fallback={null}>
          <MonthPicker month={month} />
        </Suspense>
      </div>

      {/* KPI stat row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className="text-label-caps uppercase tracking-[0.05em] font-medium text-muted-foreground">
                {kpi.label}
              </p>
              <p
                className={`mt-1 font-display text-display-metric font-medium tabular-nums leading-none ${
                  kpi.highlight ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {seededFrom && <SeededFromBanner sourceMonth={seededFrom} />}

      <OverBudgetCards items={items} />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories found. Add some categories first.
        </p>
      ) : (
        <>
          {/* Desktop: table */}
          <BudgetTable items={items} month={month} className="hidden md:block" />

          {/* Mobile: card list */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {items.map((item) => (
              <BudgetCard key={item.category.id} item={item} month={month} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
