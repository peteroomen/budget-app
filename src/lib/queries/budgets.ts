import { getFinancialSnapshot } from './financial-snapshot'
import { monthDateRange } from '@/lib/utils/month'
import { expenseCents } from '@/lib/finance/amounts'
import type { Category, Budget } from '@/types'

export interface BudgetWithActual {
  category: Category
  budget: Budget | null
  actual_cents: number
}

/** Standing expense caps compared with signed expense activity, including refunds. */
export async function getBudgetsWithActuals(month: string): Promise<BudgetWithActual[]> {
  const { dateFrom, dateTo } = monthDateRange(month)
  const { categories, budgets, transactions } = await getFinancialSnapshot(dateFrom, dateTo)
  const budgetMap = new Map(budgets.map((b) => [b.category_id, b]))
  const actualMap = new Map<string, number>()
  for (const row of transactions) {
    if (!row.category_id) continue
    actualMap.set(
      row.category_id,
      (actualMap.get(row.category_id) ?? 0) + expenseCents(row.amount_cents, row.category?.type)
    )
  }
  return categories
    .filter((c) => c.type === 'expense')
    .map((category) => ({
      category,
      budget: budgetMap.get(category.id) ?? null,
      actual_cents: actualMap.get(category.id) ?? 0,
    }))
}
