const { test } = require('node:test')
const assert = require('node:assert/strict')
const { expenseCents, incomeCents, budgetState } = require('../src/lib/finance/amounts.ts')
const { parseCsv } = require('../src/lib/parsers/csv.ts')
const { parseMoney } = require('../src/lib/import/validation.ts')
const { selectNewOccurrences } = require('../src/lib/import/duplicates.ts')
const {
  isValidMonth,
  monthDateRange,
  nzDate,
  monthStatus,
  nextMonth,
  prevMonth,
} = require('../src/lib/utils/month.ts')
const { localRedirect } = require('../src/lib/utils/local-redirect.ts')
const { readAll } = require('../src/lib/queries/all-rows.ts')
const { parseSummary } = require('../src/lib/finance/summary-schema.ts')

test('signed expenses, refunds, income reversals and transfers conserve net cashflow', () => {
  const rows = [
    [-10000, 'expense'],
    [3000, 'expense'],
    [50000, 'income'],
    [-2000, 'income'],
    [-9000, 'transfer'],
    [9000, 'transfer'],
    [-700, null],
    [1000, null],
  ]
  const expense = rows.reduce((s, [a, t]) => s + expenseCents(a, t), 0)
  const income = rows.reduce((s, [a, t]) => s + incomeCents(a, t), 0)
  assert.equal(expense, 7700)
  assert.equal(income, 49000)
  assert.equal(
    income - expense,
    rows.reduce((s, [a]) => s + a, 0)
  )
  assert.equal(expenseCents(1000, 'expense'), -1000)
})
test('zero caps, exactly at cap and refund-only budgets', () => {
  assert.equal(budgetState(1, 0).over, true)
  assert.equal(budgetState(1, 0).progress, 100)
  assert.equal(budgetState(100, 100).over, false)
  assert.equal(budgetState(100, 100).at, true)
  assert.equal(budgetState(-100, 100).progress, 0)
  assert.equal(budgetState(100, null).over, false)
})
test('strict dates and complete CSV validation across NZ formats', () => {
  assert.equal(
    parseCsv('Type,Details,Amount,Date\nD,Coffee,-12.34,29/02/2024').rows[0].amount_cents,
    -1234
  )
  for (const row of [
    'D,Coffee,-12.34,29/02/2025',
    'D,Coffee,12oops,01/09/2026',
    'D,Coffee,Infinity,01/09/2026',
    'D,Coffee,-1,01/09/2026/trailing',
    'D,Coffee,,01/09/2026',
  ]) {
    assert.equal(parseCsv(`Type,Details,Amount,Date\nD,Valid,-5,01/09/2026\n${row}`).ok, false)
  }
  assert.equal(parseCsv('Date,Unique Id,Tran Type,Payee,Amount\n2026/09/01,1,D,ASB,-1').ok, true)
  assert.equal(
    parseCsv('Date,Amount,Payee,Particulars,Account number\n01/09/2026,-1,BNZ,,123').ok,
    true
  )
  const westpac = 'Date,Narration,Debit,Credit,Balance\n01/09/2026,Westpac,'
  assert.equal(parseCsv(westpac + '12.50,,0').rows[0].amount_cents, -1250)
  assert.equal(parseCsv(westpac + ',12.50,0').rows[0].amount_cents, 1250)
  for (const amounts of ['2,3,0', '-2,,0', 'oops,0,0'])
    assert.equal(parseCsv(westpac + amounts).ok, false)
})
test('strict cents reject partial numbers, malformed grouping, excess precision and overflow', () => {
  assert.equal(parseMoney('-1,234.56'), -123456)
  assert.equal(parseMoney('0.29'), 29)
  for (const value of ['1,2', '12abc', 'Infinity', '1e3', '1.234', '21474836.48', ''])
    assert.equal(parseMoney(value), null, value)
})
test('multiset previews preserve repeated identical purchases', () => {
  const row = { date: '2026-09-01', amount_cents: -100, description: 'Coffee' }
  assert.equal(selectNewOccurrences([row, row], []).length, 2)
  assert.equal(selectNewOccurrences([row, row], [row]).length, 1)
  assert.equal(selectNewOccurrences([row, row], [row, row]).length, 0)
})
test('NZ calendar boundaries and invalid months', () => {
  assert.equal(nzDate(new Date('2026-08-31T13:00:00Z')), '2026-09-01')
  assert.equal(monthStatus('2026-09', new Date('2026-08-31T13:00:00Z')).dayOfMonth, 1)
  assert.equal(monthDateRange('2024-02').dateTo, '2024-02-29')
  assert.equal(monthDateRange('2025-02').dateTo, '2025-02-28')
  assert.equal(nextMonth('2026-12'), '2027-01')
  assert.equal(prevMonth('2026-01'), '2025-12')
  for (const m of ['2026-00', '2026-13', '2026-1', 'invalid']) assert.equal(isValidMonth(m), false)
})
test('auth redirects stay on this origin', () => {
  const origin = 'https://tide.example'
  for (const target of [
    '@evil.example',
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
  ])
    assert.equal(new URL(localRedirect(target, origin)).origin, origin)
  assert.equal(
    localRedirect('/transactions?month=2026-09', origin),
    origin + '/transactions?month=2026-09'
  )
})
test('complete paging reads all rows and fails closed after a later-page error', async () => {
  const rows = Array.from({ length: 1201 }, (_, id) => ({ id }))
  assert.equal(
    (await readAll(async (from, to) => ({ data: rows.slice(from, to + 1), error: null }))).length,
    1201
  )
  await assert.rejects(
    readAll(async (from) =>
      from === 0
        ? { data: rows.slice(0, 500), error: null }
        : { data: null, error: { message: 'offline' } }
    ),
    /unavailable|load/i
  )
})
test('recap JSON must have a renderable structure', () => {
  const valid = {
    headline: 'Recap',
    spendNote: 'Spending',
    overBudgetCategories: [],
    biggestMerchantNote: null,
    vsLastMonthNote: null,
    notablePatterns: [],
  }
  assert.deepEqual(parseSummary(JSON.stringify(valid)), valid)
  for (const invalid of [
    null,
    {},
    { ...valid, notablePatterns: 'wrong' },
    { ...valid, overBudgetCategories: [{ category: 12, note: 'x' }] },
  ])
    assert.throws(() => parseSummary(JSON.stringify(invalid)))
})
