import { createClient } from '@/lib/supabase/server'
import type { Category, Budget } from '@/types'

export interface BudgetWithActual {
  category: Category
  budget: Budget | null
  actual_cents: number
}

function firstDayOfNextMonth(month: string): string {
  const parts = month.split('-').map(Number)
  // JS months are 0-based; passing the 1-based month value directly yields the next month
  const next = new Date(parts[0]!, parts[1]!, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`
}

export async function getBudgetsWithActuals(month: string): Promise<BudgetWithActual[]> {
  const supabase = await createClient()

  const [categoriesResult, budgetsResult, actualsResult] = await Promise.all([
    supabase.from('categories').select('*').order('name', { ascending: true }),
    supabase.from('budgets').select('*').eq('month', month),
    supabase
      .from('transactions')
      .select('category_id, amount_cents')
      .gte('date', `${month}-01`)
      .lt('date', firstDayOfNextMonth(month))
      .lt('amount_cents', 0),
  ])

  const categories: Category[] = categoriesResult.data ?? []
  const budgets: Budget[] = budgetsResult.data ?? []
  const actuals: { category_id: string | null; amount_cents: number }[] = actualsResult.data ?? []

  const budgetMap = new Map<string, Budget>(budgets.map((b) => [b.category_id, b]))

  const actualMap = new Map<string, number>()
  for (const row of actuals) {
    if (!row.category_id) continue
    actualMap.set(row.category_id, (actualMap.get(row.category_id) ?? 0) + row.amount_cents)
  }

  return categories.map((category) => ({
    category,
    budget: budgetMap.get(category.id) ?? null,
    actual_cents: Math.abs(actualMap.get(category.id) ?? 0),
  }))
}
