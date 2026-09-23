const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
let calls = 0,
  mode = 'ok'
const p = path.resolve('src/lib/bank/sync.ts')
require.cache[p] = {
  id: p,
  filename: p,
  loaded: true,
  exports: {
    runBankSync: async () => {
      calls++
      if (mode === 'throw') throw new Error('private provider payload')
      return mode === 'error'
        ? { results: [{ status: 'error', code: 'unavailable' }] }
        : { disabled: true, results: [] }
    },
  },
}
const { GET } = require('../src/app/api/cron/bank-sync/route.ts')
test('cron fails closed without its secret and returns retryable safe errors', async () => {
  const before = process.env.CRON_SECRET
  const req = (value) =>
    new Request('https://fixture.test/api/cron/bank-sync', {
      headers: value ? { authorization: value } : {},
    })
  try {
    delete process.env.CRON_SECRET
    assert.equal((await GET(req())).status, 401)
    process.env.CRON_SECRET = 'synthetic-cron-secret'
    for (const value of [undefined, 'Bearer incorrect', 'Bearer synthetic-cron-secrex'])
      assert.equal((await GET(req(value))).status, 401)
    assert.equal(calls, 0)
    const success = await GET(req('Bearer synthetic-cron-secret'))
    assert.equal(success.status, 200)
    assert.equal(success.headers.get('cache-control'), 'no-store')
    mode = 'error'
    assert.equal((await GET(req('Bearer synthetic-cron-secret'))).status, 503)
    mode = 'throw'
    const failure = await GET(req('Bearer synthetic-cron-secret'))
    assert.equal(failure.status, 503)
    assert.ok(!(await failure.text()).includes('private provider'))
  } finally {
    if (before === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = before
  }
})
