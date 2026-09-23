import { getFinancialSnapshot } from './financial-snapshot'
import { currentMonth, monthDateRange } from '@/lib/utils/month'
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

/** A category a budget cap can be set on, plus its current standing cap. */
export interface BudgetCapTarget {
  id: string
  name: string
  capCents: number | null
}

/**
 * Every category a cap can legitimately be set on (expense categories only), with the cap
 * it currently has.
 *
 * Used in two places, and it matters that both read the same list:
 *  - the chat context injects it so Claude has real category ids to propose against;
 *  - the chat page passes it to the confirmation card, which resolves the display name and
 *    the "currently" figure from it rather than from anything the model said, and refuses
 *    to offer "Apply" for an id that is not in the list.
 */
export async function getBudgetCapTargets(): Promise<BudgetCapTarget[]> {
  // A one-day window keeps the transaction payload empty; categories and caps are global.
  const { dateTo } = monthDateRange(currentMonth())
  const { categories, budgets } = await getFinancialSnapshot(dateTo, dateTo)
  return capTargets(categories, budgets)
}

/** Expense categories with their standing caps, from one snapshot. */
export function capTargets(
  categories: Pick<Category, 'id' | 'name' | 'type'>[],
  budgets: Pick<Budget, 'category_id' | 'amount_cents'>[]
): BudgetCapTarget[] {
  const capMap = new Map(budgets.map((b) => [b.category_id, b.amount_cents]))
  return categories
    .filter((c) => c.type === 'expense')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ id: c.id, name: c.name, capCents: capMap.get(c.id) ?? null }))
}
