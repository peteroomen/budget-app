import { createClient } from '@/lib/supabase/server'
import { monthDateRange } from '@/lib/utils/month'

export interface CategorySpend {
  category_id: string | null
  category_name: string
  category_color: string | null
  spend_cents: number
}

export interface MerchantSpend {
  merchant: string
  spend_cents: number
}

export interface DashboardSummary {
  income_cents: number
  received_income_cents: number
  expected_income_cents: number | null
  spend_cents: number
  total_budgeted_cents: number
  net_cents: number
}

export interface DashboardData {
  month: string // YYYY-MM
  summary: DashboardSummary
  byCategory: CategorySpend[]
  topMerchants: MerchantSpend[]
}

type TxRow = {
  amount_cents: number
  merchant_name: string | null
  description: string
  category_id: string | null
  category: { name: string; color: string | null; type: string } | null
}

export async function getDashboardData(month: string): Promise<DashboardData> {
  const supabase = await createClient()
  const { dateFrom, dateTo } = monthDateRange(month)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let expected_income_cents: number | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.household_id) {
      const { data: household } = await supabase
        .from('households')
        .select('expected_monthly_income_cents')
        .eq('id', profile.household_id)
        .maybeSingle()
      expected_income_cents = household?.expected_monthly_income_cents ?? null
    }
  }

  const [txResult, budgetsResult] = await Promise.all([
    supabase
      .from('transactions')
      .select(
        'amount_cents, merchant_name, description, category_id, category:categories(name, color, type)'
      )
      .gte('date', dateFrom)
      .lte('date', dateTo),
    supabase.from('budgets').select('amount_cents').eq('month', month),
  ])

  if (txResult.error) console.error('getDashboardData/tx:', txResult.error.message)
  if (budgetsResult.error) console.error('getDashboardData/budgets:', budgetsResult.error.message)

  const transactions = (txResult.data ?? []) as unknown as TxRow[]
  const budgetRows = (budgetsResult.data ?? []) as { amount_cents: number }[]

  const total_budgeted_cents = budgetRows.reduce((s, b) => s + (b.amount_cents ?? 0), 0)

  // Summary — transfers (savings moves, CC payments) excluded from both income
  // and spend; they're internal money movement, not real cashflow.
  let income_cents = 0
  let received_income_cents = 0
  let spend_cents = 0
  for (const t of transactions) {
    if (t.category?.type === 'transfer') continue
    if (t.amount_cents > 0) {
      income_cents += t.amount_cents
      if (t.category?.type === 'income') {
        received_income_cents += t.amount_cents
      }
    } else {
      spend_cents += Math.abs(t.amount_cents)
    }
  }

  // Spend by category (expenses only; transfers excluded)
  const categoryMap = new Map<
    string,
    { category_name: string; category_color: string | null; spend_cents: number }
  >()

  for (const t of transactions) {
    if (t.amount_cents >= 0) continue
    if (t.category?.type === 'transfer') continue
    const key = t.category_id ?? '__uncategorised__'
    const name = t.category?.name ?? 'Uncategorised'
    const color = t.category?.color ?? null
    const existing = categoryMap.get(key)
    if (existing) {
      existing.spend_cents += Math.abs(t.amount_cents)
    } else {
      categoryMap.set(key, {
        category_name: name,
        category_color: color,
        spend_cents: Math.abs(t.amount_cents),
      })
    }
  }

  const byCategory: CategorySpend[] = Array.from(categoryMap.entries())
    .map(([category_id, v]) => ({
      category_id: category_id === '__uncategorised__' ? null : category_id,
      ...v,
    }))
    .sort((a, b) => b.spend_cents - a.spend_cents)

  // Top 5 merchants by spend (expenses only; transfers excluded)
  const merchantMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.amount_cents >= 0) continue
    if (t.category?.type === 'transfer') continue
    const key = t.merchant_name ?? t.description
    merchantMap.set(key, (merchantMap.get(key) ?? 0) + Math.abs(t.amount_cents))
  }

  const topMerchants: MerchantSpend[] = Array.from(merchantMap.entries())
    .map(([merchant, spend_cents]) => ({ merchant, spend_cents }))
    .sort((a, b) => b.spend_cents - a.spend_cents)
    .slice(0, 5)

  return {
    month,
    summary: {
      income_cents,
      received_income_cents,
      expected_income_cents,
      spend_cents,
      total_budgeted_cents,
      net_cents: income_cents - spend_cents,
    },
    byCategory,
    topMerchants,
  }
}
