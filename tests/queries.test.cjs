const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const e = { id: 'expense', name: 'Groceries', type: 'expense', color: null }
const refund = { id: 'refund', name: 'Refund only', type: 'expense', color: null }
const salary = { id: 'income', name: 'Income', type: 'income', color: null }
const transfer = { id: 'transfer', name: 'Transfer', type: 'transfer', color: null }
let txId = 0
const tx = (amount, category, date = '2026-05-01') => ({
  id: String(++txId),
  account_id: 'anz',
  date,
  amount_cents: amount,
  category_id: category?.id ?? null,
  category,
  merchant_name: category?.name ?? 'Unknown',
  description: 'Fixture',
  notes: null,
  is_recurring: category === e,
})
const rows = [
  ...Array.from({ length: 1200 }, () => tx(-100, e)),
  tx(30000, e),
  tx(2000, refund),
  tx(200000, salary),
  tx(-10000, salary),
  tx(-500, null),
  tx(1000, null),
  tx(-50000, transfer),
  tx(50000, transfer),
  tx(-900, e, '2026-04-01'),
  tx(200, e, '2026-04-02'),
]
let failed = false
const snapshotPath = path.resolve('src/lib/queries/financial-snapshot.ts')
require.cache[snapshotPath] = {
  id: snapshotPath,
  filename: snapshotPath,
  loaded: true,
  exports: {
    getFinancialSnapshot: async (from, to) => {
      if (failed) throw new Error('Financial data is unavailable')
      return {
        household: { id: 'house', name: 'Fixture', expected_monthly_income_cents: 200000 },
        categories: [e, refund, salary, transfer],
        budgets: [
          { category_id: e.id, amount_cents: 50000 },
          { category_id: refund.id, amount_cents: 0 },
        ],
        transactions: rows.filter((t) => t.date >= from && t.date <= to),
      }
    },
  },
}
const { getDashboardData } = require('../src/lib/queries/dashboard.ts')
const { getBudgetsWithActuals } = require('../src/lib/queries/budgets.ts')
const { getSummaryContext } = require('../src/lib/queries/summary.ts')
const { getChatContext, formatChatContext } = require('../src/lib/queries/chat-context.ts')
const { getFixedCostsSummary } = require('../src/lib/queries/recurring.ts')

test('dashboard, budgets, recap and chat agree beyond 1000 transactions, including refunds', async () => {
  const [dash, budgets, summary, chat, fixed] = await Promise.all([
    getDashboardData('2026-05'),
    getBudgetsWithActuals('2026-05'),
    getSummaryContext('2026-05'),
    getChatContext('2026-05'),
    getFixedCostsSummary('2026-05'),
  ])
  assert.equal(dash.transactionCount, 1208)
  assert.equal(dash.summary.spend_cents, 88500)
  assert.equal(dash.summary.income_cents, 191000)
  assert.equal(dash.summary.received_income_cents, 190000)
  assert.equal(dash.summary.net_cents, 102500)
  assert.equal(dash.summary.total_budgeted_cents, 50000)
  assert.equal(summary.spend_cents, dash.summary.spend_cents)
  assert.equal(summary.income_cents, dash.summary.income_cents)
  assert.equal(summary.priorMonthSpend, 700)
  assert.equal(budgets.find((b) => b.category.id === e.id).actual_cents, 90000)
  assert.equal(budgets.find((b) => b.category.id === refund.id).actual_cents, -2000)
  assert.equal(
    chat.budgetsVsActual.reduce((s, b) => s + b.actual_cents, 0),
    88500
  )
  assert.equal(chat.receivedIncomeCents, 190000)
  assert.equal(fixed.total_cents, 90000)
  assert.match(formatChatContext(chat), /Refund only: budget \$0.00 \| spent -\$20.00/)
})
test('a failed snapshot propagates instead of appearing as an empty healthy month', async () => {
  failed = true
  try {
    for (const query of [
      getDashboardData,
      getBudgetsWithActuals,
      getSummaryContext,
      getChatContext,
      getFixedCostsSummary,
    ])
      await assert.rejects(query('2026-05'), /unavailable/)
  } finally {
    failed = false
  }
})
