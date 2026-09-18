import { getFinancialSnapshot } from './financial-snapshot'
import { expenseCents } from '@/lib/finance/amounts'
import {
  currentMonth,
  prevMonth,
  monthDateRange,
  formatMonthLabel,
  monthStatus,
} from '@/lib/utils/month'

export interface ChatContext {
  householdName: string
  month: string
  expectedIncomeCents: number | null
  receivedIncomeCents: number
  currentTransactions: Array<{
    date: string
    merchant: string
    category: string
    amount_cents: number
    note: string | null
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
  return `${cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`
}

function firstDayOfMonth(month: string): string {
  return `${month}-01`
}

export async function getChatContext(month: string): Promise<ChatContext | null> {
  const { dateFrom, dateTo } = monthDateRange(month)
  const trendMonths = [
    prevMonth(prevMonth(prevMonth(month))),
    prevMonth(prevMonth(month)),
    prevMonth(month),
  ]
  const { transactions, categories, budgets, household } = await getFinancialSnapshot(
    firstDayOfMonth(trendMonths[0]!),
    dateTo
  )
  const householdName = household.name
  const expectedIncomeCents = household.expected_monthly_income_cents
  const rawTx = transactions.filter((t) => t.date >= dateFrom)
  const currentTransactions = rawTx
    .filter((t) => t.category?.type !== 'transfer')
    .map((t) => ({
      date: t.date,
      merchant: t.merchant_name ?? t.description,
      category: t.category?.name ?? 'Uncategorised',
      amount_cents: t.amount_cents,
      note: t.notes && t.notes.trim().length > 0 ? t.notes : null,
    }))

  // Received income is net of reversals in income-typed categories
  let receivedIncomeCents = 0
  for (const t of rawTx) {
    if (t.category?.type === 'income') {
      receivedIncomeCents += t.amount_cents
    }
  }

  // Budget vs actual — seed from all known categories so $0-activity ones are included
  const allCategoryNames = categories.filter((c) => c.type === 'expense').map((c) => c.name)

  const actualMap = new Map<string, number>()
  for (const t of rawTx) {
    const spend = expenseCents(t.amount_cents, t.category?.type)
    if (spend === 0) continue
    const name = t.category?.name ?? 'Uncategorised'
    actualMap.set(name, (actualMap.get(name) ?? 0) + spend)
  }

  const budgetMap = new Map<string, number>()
  for (const b of budgets) {
    const name = categories.find((c) => c.id === b.category_id)?.name
    if (name) budgetMap.set(name, b.amount_cents)
  }

  // Union of all categories: seeded list + any with spend or budget not in the list
  const categorySet = new Set([...allCategoryNames, ...budgetMap.keys(), ...actualMap.keys()])
  const budgetsVsActual = Array.from(categorySet)
    .map((cat) => ({
      category: cat,
      budget_cents: budgetMap.get(cat) ?? null,
      actual_cents: actualMap.get(cat) ?? 0,
    }))
    .sort((a, b) => b.actual_cents - a.actual_cents)

  // Trend: aggregate by month + category (transfers excluded)
  const rawTrend = transactions.filter((t) => t.date < dateFrom)
  const trendMap = new Map<string, Map<string, number>>() // category → month → cents

  for (const t of rawTrend) {
    const spend = expenseCents(t.amount_cents, t.category?.type)
    if (spend === 0) continue
    const cat = t.category?.name ?? 'Uncategorised'
    const m = t.date.slice(0, 7) // YYYY-MM
    if (!trendMap.has(cat)) trendMap.set(cat, new Map())
    const monthMap = trendMap.get(cat)!
    monthMap.set(m, (monthMap.get(m) ?? 0) + spend)
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

  // Recurring (transfers excluded — e.g. a recurring savings move isn't a "fixed cost")
  const rawRecurring = rawTx.filter((t) => t.is_recurring)
  const recurringMap = new Map<string, number>()
  for (const r of rawRecurring) {
    const spend = expenseCents(r.amount_cents, r.category?.type)
    if (spend === 0) continue
    const key = r.merchant_name ?? r.description
    recurringMap.set(key, (recurringMap.get(key) ?? 0) + spend)
  }
  const recurring = Array.from(recurringMap.entries())
    .map(([merchant, amount_cents]) => ({ merchant, amount_cents }))
    .sort((a, b) => b.amount_cents - a.amount_cents)

  return {
    householdName,
    month,
    expectedIncomeCents,
    receivedIncomeCents,
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
    timeZone: 'Pacific/Auckland',
  })
  const monthLabel = formatMonthLabel(ctx.month)

  const lines: string[] = [
    `<financial_data>`,
    `Household: ${ctx.householdName}`,
    `Today: ${today}`,
    `Current month: ${monthLabel}`,
    'Expense credits reduce spending. Uncategorised credits need review; do not assume they are earned income. Trends include full prior months; compare partial current months cautiously.',
    '',
  ]

  // Income — expected vs received this month
  const status = monthStatus(ctx.month)
  const statusLabel =
    status.status === 'in_progress'
      ? `${monthLabel}, in progress — day ${status.dayOfMonth} of ${status.daysInMonth}`
      : status.status === 'closed'
        ? `${monthLabel}, closed`
        : `${monthLabel}, future month`

  lines.push(`## Income (${statusLabel})`)
  if (ctx.expectedIncomeCents !== null) {
    const gap = ctx.expectedIncomeCents - ctx.receivedIncomeCents
    lines.push(`Expected: ${centsToNZD(ctx.expectedIncomeCents)}`)
    lines.push(`Received so far: ${centsToNZD(ctx.receivedIncomeCents)}`)

    if (status.status === 'in_progress') {
      if (gap > 0) {
        lines.push(
          `Pending: ${centsToNZD(gap)} (income typically arrives later in the month — treat as on-track baseline unless timing suggests otherwise)`
        )
      } else if (gap < 0) {
        lines.push(`Over expected by ${centsToNZD(Math.abs(gap))} (already above plan)`)
      } else {
        lines.push(`On plan — full expected income already received this month`)
      }
    } else if (status.status === 'closed') {
      if (gap > 0) {
        lines.push(`Shortfall: ${centsToNZD(gap)} (income came in below plan — flag this)`)
      } else {
        lines.push(`Plan was met for the month.`)
      }
    } else {
      lines.push(`Month has not started — no income received yet.`)
    }
  } else {
    lines.push(`No expected income set. Received so far: ${centsToNZD(ctx.receivedIncomeCents)}`)
  }
  lines.push('')

  // Current month transactions
  lines.push(`## ${monthLabel} Transactions (${ctx.currentTransactions.length} total)`)
  if (ctx.currentTransactions.length === 0) {
    lines.push('No transactions recorded yet.')
  } else {
    for (const t of ctx.currentTransactions) {
      const sign = t.amount_cents < 0 ? '-' : '+'
      const noteSuffix = t.note ? ` — note: ${t.note}` : ''
      lines.push(
        `${t.date} | ${t.merchant} | ${t.category} | ${sign}${centsToNZD(Math.abs(t.amount_cents))}${noteSuffix}`
      )
    }
  }
  lines.push('')

  // Budget vs actual — all categories, sorted by spend descending
  lines.push(`## Budget vs Actual (${monthLabel})`)
  lines.push(
    'Caps are standing values that apply to every month, not figures set for this month alone.'
  )
  if (ctx.budgetsVsActual.length === 0) {
    lines.push('No categories found.')
  } else {
    for (const r of ctx.budgetsVsActual) {
      const actual = centsToNZD(r.actual_cents)
      if (r.budget_cents !== null) {
        const remaining = r.budget_cents - r.actual_cents
        const status =
          remaining < 0
            ? `OVER by ${centsToNZD(Math.abs(remaining))}`
            : `${centsToNZD(remaining)} remaining`
        lines.push(
          `${r.category}: budget ${centsToNZD(r.budget_cents)} | spent ${actual} | ${status}`
        )
      } else if (r.actual_cents !== 0) {
        lines.push(`${r.category}: spent ${actual} (no budget set)`)
      } else {
        lines.push(`${r.category}: $0 spent, no budget`)
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
