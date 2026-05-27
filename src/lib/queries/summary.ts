import { createClient } from '@/lib/supabase/server'
import { monthDateRange, formatMonthLabel, prevMonth, monthStatus } from '@/lib/utils/month'

export interface CategorySummaryRow {
  name: string
  actual_cents: number
  budget_cents: number | null
}

export interface MerchantSummaryRow {
  merchant: string
  spend_cents: number
}

export interface NotedTransactionRow {
  date: string
  merchant: string
  amount_cents: number
  note: string
}

export interface SummaryContext {
  month: string
  monthLabel: string
  income_cents: number
  received_income_cents: number
  expected_income_cents: number | null
  spend_cents: number
  net_cents: number
  categories: CategorySummaryRow[]
  topMerchants: MerchantSummaryRow[]
  notedTransactions: NotedTransactionRow[]
  priorMonthSpend: number | null
  priorMonthLabel: string | null
  priorMonthCategories: CategorySummaryRow[] | null
  hasBudgets: boolean
  hasTransactions: boolean
}

type TxRow = {
  date: string
  amount_cents: number
  merchant_name: string | null
  description: string
  notes: string | null
  category_id: string | null
  category: { name: string; type: string } | null
}

type PriorTxRow = {
  amount_cents: number
  category_id: string | null
  category: { name: string } | null
}

export async function getSummaryContext(month: string): Promise<SummaryContext> {
  const supabase = await createClient()
  const { dateFrom, dateTo } = monthDateRange(month)
  const prior = prevMonth(month)
  const { dateFrom: priorFrom, dateTo: priorTo } = monthDateRange(prior)

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

  const [currentResult, budgetResult, priorResult] = await Promise.all([
    supabase
      .from('transactions')
      .select(
        'date, amount_cents, merchant_name, description, notes, category_id, category:categories(name, type)'
      )
      .gte('date', dateFrom)
      .lte('date', dateTo),
    supabase.from('budgets').select('category_id, amount_cents').eq('month', month),
    supabase
      .from('transactions')
      .select('amount_cents, category_id, category:categories(name)')
      .gte('date', priorFrom)
      .lte('date', priorTo),
  ])

  const current = (currentResult.data ?? []) as unknown as TxRow[]
  const budgets = budgetResult.data ?? []
  const priorTxs = (priorResult.data ?? []) as unknown as PriorTxRow[]

  if (current.length === 0) {
    return {
      month,
      monthLabel: formatMonthLabel(month),
      income_cents: 0,
      received_income_cents: 0,
      expected_income_cents,
      spend_cents: 0,
      net_cents: 0,
      categories: [],
      topMerchants: [],
      notedTransactions: [],
      priorMonthSpend: null,
      priorMonthLabel: null,
      priorMonthCategories: null,
      hasBudgets: budgets.length > 0,
      hasTransactions: false,
    }
  }

  // Totals
  let income_cents = 0
  let received_income_cents = 0
  let spend_cents = 0
  for (const t of current) {
    if (t.amount_cents > 0) {
      income_cents += t.amount_cents
      if (t.category?.type === 'income') received_income_cents += t.amount_cents
    } else {
      spend_cents += Math.abs(t.amount_cents)
    }
  }

  // Category actuals (expenses only)
  const actualMap = new Map<string, number>()
  const categoryNames = new Map<string, string>()
  for (const t of current) {
    if (t.amount_cents >= 0) continue
    const key = t.category_id ?? '__uncategorised__'
    actualMap.set(key, (actualMap.get(key) ?? 0) + Math.abs(t.amount_cents))
    if (t.category?.name) categoryNames.set(key, t.category.name)
  }
  if (actualMap.has('__uncategorised__')) categoryNames.set('__uncategorised__', 'Uncategorised')

  type BudgetRow = { category_id: string; amount_cents: number }
  const budgetMap = new Map<string, number>(
    (budgets as BudgetRow[]).map((b) => [b.category_id, b.amount_cents])
  )

  const categories: CategorySummaryRow[] = Array.from(actualMap.entries())
    .map(([id, actual_cents]) => ({
      name: categoryNames.get(id) ?? 'Unknown',
      actual_cents,
      budget_cents: budgetMap.get(id) ?? null,
    }))
    .sort((a, b) => b.actual_cents - a.actual_cents)

  // Top 5 merchants (expenses only)
  const merchantMap = new Map<string, number>()
  for (const t of current) {
    if (t.amount_cents >= 0) continue
    const key = t.merchant_name ?? t.description
    merchantMap.set(key, (merchantMap.get(key) ?? 0) + Math.abs(t.amount_cents))
  }
  const topMerchants: MerchantSummaryRow[] = Array.from(merchantMap.entries())
    .map(([merchant, spend_cents]) => ({ merchant, spend_cents }))
    .sort((a, b) => b.spend_cents - a.spend_cents)
    .slice(0, 5)

  // Noted transactions — surface verbatim notes to Claude
  const notedTransactions: NotedTransactionRow[] = current
    .filter((t) => t.notes !== null && t.notes.trim().length > 0)
    .map((t) => ({
      date: t.date,
      merchant: t.merchant_name ?? t.description,
      amount_cents: t.amount_cents,
      note: t.notes!.trim(),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(0, 30)

  // Prior month
  let priorMonthSpend: number | null = null
  let priorMonthCategories: CategorySummaryRow[] | null = null

  if (priorTxs.length > 0) {
    priorMonthSpend = 0
    const priorActualMap = new Map<string, number>()
    const priorNames = new Map<string, string>()

    for (const t of priorTxs) {
      if (t.amount_cents < 0) {
        priorMonthSpend += Math.abs(t.amount_cents)
        const key = t.category_id ?? '__uncategorised__'
        priorActualMap.set(key, (priorActualMap.get(key) ?? 0) + Math.abs(t.amount_cents))
        if (t.category?.name) priorNames.set(key, t.category.name)
      }
    }
    if (priorActualMap.has('__uncategorised__'))
      priorNames.set('__uncategorised__', 'Uncategorised')

    priorMonthCategories = Array.from(priorActualMap.entries())
      .map(([id, actual_cents]) => ({
        name: priorNames.get(id) ?? 'Unknown',
        actual_cents,
        budget_cents: null,
      }))
      .sort((a, b) => b.actual_cents - a.actual_cents)
  }

  return {
    month,
    monthLabel: formatMonthLabel(month),
    income_cents,
    received_income_cents,
    expected_income_cents,
    spend_cents,
    net_cents: income_cents - spend_cents,
    categories,
    topMerchants,
    notedTransactions,
    priorMonthSpend,
    priorMonthLabel: priorTxs.length > 0 ? formatMonthLabel(prior) : null,
    priorMonthCategories,
    hasBudgets: budgets.length > 0,
    hasTransactions: true,
  }
}

export function buildSummaryPrompt(ctx: SummaryContext): string {
  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 2,
    }).format(cents / 100)

  const status = monthStatus(ctx.month)
  const statusLine =
    status.status === 'in_progress'
      ? `Income status: month in progress (day ${status.dayOfMonth} of ${status.daysInMonth})`
      : status.status === 'closed'
        ? `Income status: month closed`
        : `Income status: future month (not yet started)`

  const lines: string[] = [
    `Month: ${ctx.monthLabel}`,
    statusLine,
    `Total income: ${fmt(ctx.income_cents)}`,
    `Total spend: ${fmt(ctx.spend_cents)}`,
    `Net: ${fmt(Math.abs(ctx.net_cents))} ${ctx.net_cents >= 0 ? 'saved' : 'deficit'}`,
  ]

  if (ctx.expected_income_cents !== null) {
    const gap = ctx.expected_income_cents - ctx.received_income_cents

    if (status.status === 'in_progress') {
      if (gap > 0) {
        lines.push(
          `Expected income: ${fmt(ctx.expected_income_cents)} — ${fmt(ctx.received_income_cents)} received so far in income categories. Pending: ${fmt(gap)} still expected before month end (treat as on-track unless there is a reason it won't arrive).`
        )
      } else if (gap < 0) {
        lines.push(
          `Expected income: ${fmt(ctx.expected_income_cents)} — ${fmt(ctx.received_income_cents)} received in income categories (${fmt(Math.abs(gap))} above plan so far).`
        )
      } else {
        lines.push(
          `Expected income: ${fmt(ctx.expected_income_cents)} — fully received so far this month.`
        )
      }
    } else if (status.status === 'closed') {
      if (gap > 0) {
        lines.push(
          `Expected income: ${fmt(ctx.expected_income_cents)} — ${fmt(ctx.received_income_cents)} received in income categories. Shortfall: ${fmt(gap)} (income came in below plan — flag this).`
        )
      } else {
        lines.push(
          `Expected income: ${fmt(ctx.expected_income_cents)} — ${fmt(ctx.received_income_cents)} received in income categories. Plan was met.`
        )
      }
    } else {
      lines.push(
        `Expected income: ${fmt(ctx.expected_income_cents)} — none received (month has not started).`
      )
    }
  }

  lines.push('', 'Spending by category:')

  for (const c of ctx.categories) {
    if (c.budget_cents !== null) {
      const diff = c.actual_cents - c.budget_cents
      const diffLabel =
        diff > 0 ? `${fmt(diff)} over budget` : `${fmt(Math.abs(diff))} under budget`
      lines.push(
        `- ${c.name}: ${fmt(c.actual_cents)} (budget: ${fmt(c.budget_cents)} — ${diffLabel})`
      )
    } else {
      lines.push(`- ${c.name}: ${fmt(c.actual_cents)} (no budget set)`)
    }
  }

  if (ctx.topMerchants.length > 0) {
    lines.push('', 'Top merchants by spend:')
    ctx.topMerchants.forEach((m, i) => {
      lines.push(`${i + 1}. ${m.merchant} — ${fmt(m.spend_cents)}`)
    })
  }

  if (ctx.priorMonthSpend !== null && ctx.priorMonthLabel) {
    lines.push(
      '',
      `Prior month (${ctx.priorMonthLabel}):`,
      `Total spend: ${fmt(ctx.priorMonthSpend)}`
    )
    if (ctx.priorMonthCategories && ctx.priorMonthCategories.length > 0) {
      lines.push('Spending by category:')
      for (const c of ctx.priorMonthCategories) {
        lines.push(`- ${c.name}: ${fmt(c.actual_cents)}`)
      }
    }
  }

  if (ctx.notedTransactions.length > 0) {
    lines.push(
      '',
      `Transactions with notes (${ctx.monthLabel}) — user-supplied context. Use these to inform notablePatterns or spendNote; do not invent commentary about un-noted transactions:`
    )
    for (const n of ctx.notedTransactions) {
      const sign = n.amount_cents < 0 ? '-' : '+'
      lines.push(
        `- ${n.date}, ${n.merchant}, ${sign}${fmt(Math.abs(n.amount_cents))}, note: ${n.note}`
      )
    }
  }

  lines.push(
    '',
    'Return ONLY a JSON object (no markdown fences, no other text) with exactly this structure:',
    '{',
    '  "headline": "One sentence overall take including total spend amount",',
    '  "spendNote": "2-3 sentences about total spend, vs budget if budgets are set, and overall financial health",',
    '  "overBudgetCategories": [{ "category": "Name", "note": "1 sentence" }],',
    '  "biggestMerchantNote": "1 sentence about the top merchant or null",',
    '  "vsLastMonthNote": "1-2 sentences comparing to prior month or null if no prior data",',
    '  "notablePatterns": ["2-3 short observations"]',
    '}'
  )

  return lines.join('\n')
}
