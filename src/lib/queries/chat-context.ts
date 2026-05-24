import { createClient } from '@/lib/supabase/server'
import { currentMonth, prevMonth, monthDateRange, formatMonthLabel } from '@/lib/utils/month'

export interface ChatContext {
  householdName: string
  month: string
  currentTransactions: Array<{
    date: string
    merchant: string
    category: string
    amount_cents: number
  }>
  budgetsVsActual: Array<{
    category: string
    budget_cents: number | null
    actual_cents: number
  }>
  trends: Array<{
    category: string
    months: Array<{ month: string; actual_cents: number }>
  }>
  recurring: Array<{
    merchant: string
    amount_cents: number
  }>
}

function centsToNZD(cents: number): string {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`
}

function firstDayOfMonth(month: string): string {
  return `${month}-01`
}

export async function getChatContext(month: string): Promise<ChatContext | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.household_id) return null

  const { dateFrom, dateTo } = monthDateRange(month)

  // Trend: 3 months prior to current
  const trendMonths = [
    prevMonth(prevMonth(prevMonth(month))),
    prevMonth(prevMonth(month)),
    prevMonth(month),
  ]
  const trendStart = firstDayOfMonth(trendMonths[0]!)
  const trendEnd = firstDayOfMonth(month) // exclusive

  const [householdResult, txResult, budgetsResult, trendTxResult, recurringResult] =
    await Promise.all([
      supabase.from('households').select('name').eq('id', profile.household_id).single(),

      // Current month transactions (expenses + income)
      supabase
        .from('transactions')
        .select('date, amount_cents, merchant_name, description, category:categories(name)')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false }),

      // Budgets for current month
      supabase
        .from('budgets')
        .select('category_id, amount_cents, category:categories(name)')
        .eq('month', month),

      // Trend: last 3 months of expense transactions
      supabase
        .from('transactions')
        .select('date, amount_cents, category:categories(name)')
        .gte('date', trendStart)
        .lt('date', trendEnd)
        .lt('amount_cents', 0),

      // Recurring transactions this month
      supabase
        .from('transactions')
        .select('merchant_name, description, amount_cents')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .eq('is_recurring', true)
        .lt('amount_cents', 0),
    ])

  const householdName = householdResult.data?.name ?? 'Household'

  // Current month transactions
  type RawTx = {
    date: string
    amount_cents: number
    merchant_name: string | null
    description: string
    category: { name: string } | null
  }
  const rawTx = (txResult.data ?? []) as unknown as RawTx[]
  const currentTransactions = rawTx.map((t) => ({
    date: t.date,
    merchant: t.merchant_name ?? t.description,
    category: t.category?.name ?? 'Uncategorised',
    amount_cents: t.amount_cents,
  }))

  // Budget vs actual
  type RawBudget = {
    category_id: string
    amount_cents: number
    category: { name: string } | null
  }
  const rawBudgets = (budgetsResult.data ?? []) as unknown as RawBudget[]

  // Compute actuals from current month expense transactions
  const actualMap = new Map<string, { name: string; cents: number }>()
  for (const t of rawTx) {
    if (t.amount_cents >= 0) continue
    const name = t.category?.name ?? 'Uncategorised'
    const existing = actualMap.get(name)
    if (existing) {
      existing.cents += Math.abs(t.amount_cents)
    } else {
      actualMap.set(name, { name, cents: Math.abs(t.amount_cents) })
    }
  }

  // Merge budget rows with actuals; include categories with spend but no budget
  const budgetMap = new Map<string, number>()
  for (const b of rawBudgets) {
    const name = b.category?.name
    if (name) budgetMap.set(name, b.amount_cents)
  }

  const allCategories = new Set([...budgetMap.keys(), ...actualMap.keys()])
  const budgetsVsActual = Array.from(allCategories)
    .map((cat) => ({
      category: cat,
      budget_cents: budgetMap.get(cat) ?? null,
      actual_cents: actualMap.get(cat)?.cents ?? 0,
    }))
    .sort((a, b) => b.actual_cents - a.actual_cents)

  // Trend: aggregate by month + category
  type RawTrend = {
    date: string
    amount_cents: number
    category: { name: string } | null
  }
  const rawTrend = (trendTxResult.data ?? []) as unknown as RawTrend[]
  const trendMap = new Map<string, Map<string, number>>() // category → month → cents

  for (const t of rawTrend) {
    const cat = t.category?.name ?? 'Uncategorised'
    const m = t.date.slice(0, 7) // YYYY-MM
    if (!trendMap.has(cat)) trendMap.set(cat, new Map())
    const monthMap = trendMap.get(cat)!
    monthMap.set(m, (monthMap.get(m) ?? 0) + Math.abs(t.amount_cents))
  }

  const trends = Array.from(trendMap.entries())
    .map(([category, monthMap]) => ({
      category,
      months: trendMonths.map((m) => ({ month: m, actual_cents: monthMap.get(m) ?? 0 })),
    }))
    .sort((a, b) => {
      const aTotal = a.months.reduce((s, x) => s + x.actual_cents, 0)
      const bTotal = b.months.reduce((s, x) => s + x.actual_cents, 0)
      return bTotal - aTotal
    })

  // Recurring
  type RawRecurring = {
    merchant_name: string | null
    description: string
    amount_cents: number
  }
  const rawRecurring = (recurringResult.data ?? []) as unknown as RawRecurring[]
  // Deduplicate by merchant name
  const recurringMap = new Map<string, number>()
  for (const r of rawRecurring) {
    const key = r.merchant_name ?? r.description
    recurringMap.set(key, (recurringMap.get(key) ?? 0) + Math.abs(r.amount_cents))
  }
  const recurring = Array.from(recurringMap.entries())
    .map(([merchant, amount_cents]) => ({ merchant, amount_cents }))
    .sort((a, b) => b.amount_cents - a.amount_cents)

  return {
    householdName,
    month,
    currentTransactions,
    budgetsVsActual,
    trends,
    recurring,
  }
}

export function formatChatContext(ctx: ChatContext): string {
  const today = new Date().toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const monthLabel = formatMonthLabel(ctx.month)

  const lines: string[] = [
    `<financial_data>`,
    `Household: ${ctx.householdName}`,
    `Today: ${today}`,
    `Current month: ${monthLabel}`,
    '',
  ]

  // Current month transactions
  lines.push(`## ${monthLabel} Transactions (${ctx.currentTransactions.length} total)`)
  if (ctx.currentTransactions.length === 0) {
    lines.push('No transactions recorded yet.')
  } else {
    for (const t of ctx.currentTransactions) {
      const sign = t.amount_cents < 0 ? '-' : '+'
      lines.push(`${t.date} | ${t.merchant} | ${t.category} | ${sign}${centsToNZD(t.amount_cents)}`)
    }
  }
  lines.push('')

  // Budget vs actual
  lines.push(`## Budget vs Actual (${monthLabel})`)
  const budgetedRows = ctx.budgetsVsActual.filter(
    (r) => r.budget_cents !== null || r.actual_cents > 0
  )
  if (budgetedRows.length === 0) {
    lines.push('No budgets set.')
  } else {
    for (const r of budgetedRows) {
      const budget = r.budget_cents !== null ? centsToNZD(r.budget_cents) : 'no budget'
      const actual = centsToNZD(r.actual_cents)
      if (r.budget_cents !== null) {
        const remaining = r.budget_cents - r.actual_cents
        const status =
          remaining < 0
            ? `OVER by ${centsToNZD(Math.abs(remaining))}`
            : `${centsToNZD(remaining)} remaining`
        lines.push(`${r.category}: budget ${budget} | spent ${actual} | ${status}`)
      } else {
        lines.push(`${r.category}: spent ${actual} (no budget set)`)
      }
    }
  }
  lines.push('')

  // Trends
  if (ctx.trends.length > 0) {
    lines.push(`## 3-Month Spending Trends`)
    const trendMonthLabels = ctx.trends[0]!.months.map((m) => formatMonthLabel(m.month))
    for (const t of ctx.trends) {
      const cols = t.months.map((m, i) => `${trendMonthLabels[i]} ${centsToNZD(m.actual_cents)}`)
      lines.push(`${t.category}: ${cols.join(' | ')}`)
    }
    lines.push('')
  }

  // Recurring
  lines.push(`## Recurring / Fixed Costs (${monthLabel})`)
  if (ctx.recurring.length === 0) {
    lines.push('No recurring transactions flagged this month.')
  } else {
    let total = 0
    for (const r of ctx.recurring) {
      lines.push(`${r.merchant}: ${centsToNZD(r.amount_cents)}/month`)
      total += r.amount_cents
    }
    lines.push(`Total fixed costs: ${centsToNZD(total)}/month`)
  }

  lines.push(`</financial_data>`)

  return lines.join('\n')
}

export { currentMonth }
