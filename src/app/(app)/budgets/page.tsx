import { Suspense } from 'react'
import {
  getBudgetsWithActuals,
  findMostRecentBudgetMonth,
  seedBudgetsFromMonth,
} from '@/lib/queries/budgets'
import { MonthPicker } from '@/components/budgets/MonthPicker'
import { BudgetCard } from '@/components/budgets/BudgetCard'
import { OverBudgetCards } from '@/components/budgets/OverBudgetCards'
import { SeededFromBanner } from '@/components/budgets/SeededFromBanner'

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

      {seededFrom && <SeededFromBanner sourceMonth={seededFrom} />}

      <OverBudgetCards items={items} />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories found. Add some categories first.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => (
            <BudgetCard key={item.category.id} item={item} month={month} />
          ))}
        </div>
      )}
    </div>
  )
}
