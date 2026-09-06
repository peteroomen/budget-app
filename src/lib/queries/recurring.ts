import { getFinancialSnapshot } from './financial-snapshot'
import { expenseCents } from '@/lib/finance/amounts'
import { monthDateRange } from '@/lib/utils/month'

export interface FixedCostsSummary {
  total_cents: number
  merchant_count: number
}

export async function getFixedCostsSummary(month: string): Promise<FixedCostsSummary> {
  const { dateFrom, dateTo } = monthDateRange(month)
  const { transactions } = await getFinancialSnapshot(dateFrom, dateTo)
  const rows = transactions.filter(
    (t) => t.is_recurring && expenseCents(t.amount_cents, t.category?.type) !== 0
  )
  return {
    total_cents: rows.reduce((sum, r) => sum + expenseCents(r.amount_cents, r.category?.type), 0),
    merchant_count: new Set(rows.map((r) => r.merchant_name ?? r.description)).size,
  }
}
