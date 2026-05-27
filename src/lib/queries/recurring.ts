import { createClient } from '@/lib/supabase/server'
import { monthDateRange } from '@/lib/utils/month'

export interface FixedCostsSummary {
  total_cents: number
  merchant_count: number
}

export async function getFixedCostsSummary(month: string): Promise<FixedCostsSummary> {
  const supabase = await createClient()
  const { dateFrom, dateTo } = monthDateRange(month)

  const { data } = await supabase
    .from('transactions')
    .select('amount_cents, merchant_name, category:categories(type)')
    .eq('is_recurring', true)
    .lt('amount_cents', 0)
    .gte('date', dateFrom)
    .lte('date', dateTo)

  type Row = {
    amount_cents: number
    merchant_name: string | null
    category: { type: string } | null
  }
  // Transfers (savings moves, etc.) are excluded — they're not real fixed costs.
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.category?.type !== 'transfer')

  const total_cents = rows.reduce((sum, r) => sum + Math.abs(r.amount_cents), 0)
  const merchant_count = new Set(rows.map((r) => r.merchant_name ?? r.amount_cents)).size

  return { total_cents, merchant_count }
}
