import { getFinancialSnapshot } from './financial-snapshot'
import { expenseCents, incomeCents } from '@/lib/finance/amounts'
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
  transactionCount: number
  budgetCount: number
  month: string // YYYY-MM
  summary: DashboardSummary
  byCategory: CategorySpend[]
  topMerchants: MerchantSpend[]
}

export async function getDashboardData(month: string): Promise<DashboardData> {
  const { dateFrom, dateTo } = monthDateRange(month)
  const {
    transactions,
    budgets: budgetRows,
    household,
  } = await getFinancialSnapshot(dateFrom, dateTo)
  const expected_income_cents = household.expected_monthly_income_cents

  const total_budgeted_cents = budgetRows.reduce((s, b) => s + (b.amount_cents ?? 0), 0)

  // Summary — transfers (savings moves, CC payments) excluded from both income
  // and spend; they're internal money movement, not real cashflow.
  let income_cents = 0
  let received_income_cents = 0
  let spend_cents = 0
  for (const t of transactions) {
    income_cents += incomeCents(t.amount_cents, t.category?.type)
    if (t.category?.type === 'income') received_income_cents += t.amount_cents
    spend_cents += expenseCents(t.amount_cents, t.category?.type)
  }

  // Spend by category (expenses only; transfers excluded)
  const categoryMap = new Map<
    string,
    { category_name: string; category_color: string | null; spend_cents: number }
  >()

  for (const t of transactions) {
    const spend = expenseCents(t.amount_cents, t.category?.type)
    if (spend === 0) continue
    const key = t.category_id ?? '__uncategorised__'
    const name = t.category?.name ?? 'Uncategorised'
    const color = t.category?.color ?? null
    const existing = categoryMap.get(key)
    if (existing) {
      existing.spend_cents += spend
    } else {
      categoryMap.set(key, {
        category_name: name,
        category_color: color,
        spend_cents: spend,
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
    const spend = expenseCents(t.amount_cents, t.category?.type)
    if (spend === 0) continue
    const key = t.merchant_name ?? t.description
    merchantMap.set(key, (merchantMap.get(key) ?? 0) + spend)
  }

  const topMerchants: MerchantSpend[] = Array.from(merchantMap.entries())
    .map(([merchant, spend_cents]) => ({ merchant, spend_cents }))
    .sort((a, b) => b.spend_cents - a.spend_cents)
    .slice(0, 5)

  return {
    month,
    transactionCount: transactions.length,
    budgetCount: budgetRows.length,
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
