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
  spend_cents: number
  net_cents: number
}

export interface DashboardData {
  month: string // YYYY-MM
  summary: DashboardSummary
  byCategory: CategorySpend[]
  topMerchants: MerchantSpend[]
}

export async function getDashboardData(month: string): Promise<DashboardData> {
  const supabase = await createClient()
  const { dateFrom, dateTo } = monthDateRange(month)

  const { data: rows } = await supabase
    .from('transactions')
    .select(
      'amount_cents, merchant_name, description, category_id, category:categories(name, color)'
    )
    .gte('date', dateFrom)
    .lte('date', dateTo)

  const transactions = (rows ?? []) as unknown as Array<{
    amount_cents: number
    merchant_name: string | null
    description: string
    category_id: string | null
    category: { name: string; color: string | null } | null
  }>

  // Summary
  let income_cents = 0
  let spend_cents = 0
  for (const t of transactions) {
    if (t.amount_cents > 0) {
      income_cents += t.amount_cents
    } else {
      spend_cents += Math.abs(t.amount_cents)
    }
  }

  // Spend by category (expenses only)
  const categoryMap = new Map<
    string,
    { category_name: string; category_color: string | null; spend_cents: number }
  >()

  for (const t of transactions) {
    if (t.amount_cents >= 0) continue
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

  // Top 5 merchants by spend (expenses only)
  const merchantMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.amount_cents >= 0) continue
    const key = t.merchant_name ?? t.description
    merchantMap.set(key, (merchantMap.get(key) ?? 0) + Math.abs(t.amount_cents))
  }

  const topMerchants: MerchantSpend[] = Array.from(merchantMap.entries())
    .map(([merchant, spend_cents]) => ({ merchant, spend_cents }))
    .sort((a, b) => b.spend_cents - a.spend_cents)
    .slice(0, 5)

  return {
    month,
    summary: { income_cents, spend_cents, net_cents: income_cents - spend_cents },
    byCategory,
    topMerchants,
  }
}
