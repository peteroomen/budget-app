const { test } = require('node:test')
const assert = require('node:assert/strict')
const { Akahu, parseBankRow, parseAccount, queryBounds } = require('../src/lib/bank/akahu.ts')
const { bankConfig } = require('../src/lib/bank/config.ts')

const row = {
  _id: 'trans_one',
  _account: 'acc_one',
  date: '2026-09-18T01:00:00Z',
  updated_at: '2026-09-18T01:01:00Z',
  amount: -12.34,
  description: 'COFFEE',
}
test('settled bank rows use signed cents and NZ dates; invalid values fail closed', () => {
  assert.equal(parseBankRow(row, 'acc_one').amountCents, -1234)
  assert.equal(parseBankRow({ ...row, date: '2026-09-17T13:00:00Z' }, 'acc_one').date, '2026-09-18')
  for (const patch of [
    { _id: undefined },
    { _account: 'acc_other' },
    { amount: NaN },
    { amount: 1.234 },
    { amount: 21474836.48 },
    { description: '' },
    { date: '2026-02-30T01:00:00Z' },
    { updated_at: 'bad' },
  ]) {
    assert.throws(() => parseBankRow({ ...row, ...patch }, 'acc_one'))
  }
})
test('only ANZ NZD checking/savings with transaction access can be linked', () => {
  const a = {
    _id: 'acc_one',
    name: 'Everyday',
    connection: { name: 'ANZ' },
    type: 'CHECKING',
    balance: { currency: 'NZD' },
    attributes: ['TRANSACTIONS'],
    status: 'ACTIVE',
    formatted_account: '01-1234-1234567-000',
  }
  assert.equal(parseAccount(a).suffix, '-000')
  for (const patch of [
    { type: 'CREDITCARD' },
    { connection: { name: 'ASB' } },
    { balance: { currency: 'AUD' } },
    { attributes: [] },
  ])
    assert.equal(parseAccount({ ...a, ...patch }), null)
  assert.equal(parseAccount({ ...a, status: 'INACTIVE' }).active, false)
})
test('exclusive start and inclusive end cover complete NZ days over both DST transitions', () => {
  for (const [date, hours] of [
    ['2026-09-27', 23],
    ['2026-04-05', 25],
    ['2026-09-18', 24],
  ]) {
    const b = queryBounds(date, date)
    assert.equal(Date.parse(b.end) - Date.parse(b.start), hours * 3600000)
    assert.ok(b.start.endsWith('.999Z'))
    assert.ok(b.end.endsWith('.999Z'))
  }
})
test('provider pagination retains date bounds and credentials stay in headers', async () => {
  const calls = []
  const api = new Akahu('fixture-app', 'fixture-user', async (url, options) => {
    calls.push({ url, options })
    return Response.json({
      success: true,
      items: [row],
      cursor: { next: calls.length === 1 ? 'opaque cursor' : null },
    })
  })
  const first = await api.page('acc_one', '2026-09-18', '2026-09-18', null)
  await api.page('acc_one', '2026-09-18', '2026-09-18', first.next)
  const urls = calls.map((c) => new URL(c.url))
  assert.equal(urls[0].searchParams.get('start'), urls[1].searchParams.get('start'))
  assert.equal(urls[0].searchParams.get('end'), urls[1].searchParams.get('end'))
  assert.equal(urls[1].searchParams.get('cursor'), 'opaque cursor')
  assert.equal(calls[0].options.headers.Authorization, 'Bearer fixture-user')
  assert.equal(calls[0].options.headers['X-Akahu-Id'], 'fixture-app')
  assert.equal(calls[0].options.redirect, 'error')
  assert.ok(!calls[0].url.includes('fixture'))
  for (const status of [401, 403, 429, 500]) {
    const failing = new Akahu('x', 'y', async () => new Response('', { status }))
    await assert.rejects(failing.page('acc_one', '2026-09-18', '2026-09-18', null))
  }
  const malformed = new Akahu('x', 'y', async () =>
    Response.json({ success: true, items: [], cursor: {} })
  )
  await assert.rejects(malformed.page('acc_one', '2026-09-18', '2026-09-18', null))
})
test('preview deployments cannot enable bank access, even with all credentials present', () => {
  const names = [
    'BANK_SYNC_ENABLED',
    'CRON_SECRET',
    'VERCEL_ENV',
    'AKAHU_APP_TOKEN',
    'AKAHU_USER_TOKEN',
    'AKAHU_OWNER_USER_ID',
    'AKAHU_HOUSEHOLD_ID',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
  ]
  const before = Object.fromEntries(names.map((k) => [k, process.env[k]]))
  try {
    for (const k of names) process.env[k] = 'fixture'
    process.env.BANK_SYNC_ENABLED = 'true'
    process.env.VERCEL_ENV = 'preview'
    assert.equal(bankConfig(), null)
    process.env.VERCEL_ENV = 'production'
    assert.ok(bankConfig())
    process.env.BANK_SYNC_ENABLED = 'false'
    assert.equal(bankConfig(), null)
    assert.ok(bankConfig(false)) // production setup/manual sync may precede scheduled imports
    delete process.env.AKAHU_USER_TOKEN
    assert.equal(bankConfig(), null)
  } finally {
    for (const k of names) {
      if (before[k] === undefined) delete process.env[k]
      else process.env[k] = before[k]
    }
  }
})

test('documented user identity fields and stale/inactive accounts fail safely', async () => {
  const api = new Akahu('fixture', 'fixture', async () =>
    Response.json({
      success: true,
      item: { _id: 'user_one', access_granted_at: '2026-09-18T01:00:00Z' },
    })
  )
  const identity = await api.identity()
  assert.equal(identity.id, 'user_one')
  assert.equal(identity.earliestDate, '2024-09-18')
  for (const item of [
    {
      _id: 'acc_one',
      name: 'Test',
      connection: { name: 'ANZ' },
      type: 'CHECKING',
      balance: { currency: 'NZD' },
      attributes: ['TRANSACTIONS'],
      status: 'INACTIVE',
    },
    {
      _id: 'acc_one',
      name: 'Test',
      connection: { name: 'ANZ' },
      type: 'CHECKING',
      balance: { currency: 'NZD' },
      attributes: ['TRANSACTIONS'],
      status: 'ACTIVE',
      refreshed: { transactions: '2020-01-01T00:00:00Z' },
    },
  ])
    await assert.rejects(
      new Akahu('x', 'y', async () => Response.json({ success: true, item })).account('acc_one')
    )
})
test('feed status does not confuse partial imports or fresh history with fresh current totals', () => {
  const { bankStatus, bankContext } = require('../src/lib/bank/status.ts')
  const now = Date.parse('2026-09-18T12:00:00Z')
  const link = {
    name: 'ANZ',
    enabled: true,
    last_recent_date: '2026-09-18',
    last_success_at: new Date(now).toISOString(),
    recent_refreshed_at: new Date(now).toISOString(),
    initial_history_complete: true,
  }
  assert.match(bankStatus(link, now), /^Connected/)
  assert.match(bankStatus({ ...link, enabled: false }, now), /Paused/)
  assert.match(bankStatus({ ...link, sync_pending: true }, now), /progress/)
  assert.match(bankStatus({ ...link, initial_history_complete: false }, now), /history/)
  assert.match(
    bankStatus(
      {
        ...link,
        recent_refreshed_at: '2020-01-01T00:00:00Z',
        refreshed_at: new Date(now).toISOString(),
      },
      now
    ),
    /36 hours/
  )
  assert.match(bankContext([{ ...link, enabled: false }]), /Do not interpret low spending/)
})
