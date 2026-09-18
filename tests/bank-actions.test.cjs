const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
function mock(request, exports) {
  const p = request.startsWith('.') ? path.resolve(request) : require.resolve(request)
  require.cache[p] = { id: p, filename: p, loaded: true, exports }
}
let uid = 'owner',
  household = 'house',
  config = true,
  accountOwned = true,
  providerCalls = 0,
  writes = 0
mock('next/cache', { revalidatePath() {} })
mock('./src/lib/bank/config.ts', {
  bankConfig: () => (config ? { ownerId: 'owner', householdId: 'house' } : null),
})
mock('./src/lib/supabase/server.ts', {
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: uid ? { id: uid } : null } }) },
    rpc: async () => ({ data: household, error: null }),
    from: () => {
      const q = {
        select() {
          return q
        },
        eq() {
          return q
        },
        single: async () => ({ data: accountOwned ? { id: 'account' } : null, error: null }),
      }
      return q
    },
  }),
})
mock('./src/lib/bank/sync.ts', {
  bankService: () => ({
    rpc: async () => {
      writes++
      return { error: null }
    },
  }),
  safeBankError: () => 'unavailable',
  runBankSync: async () => ({ results: [] }),
})
const actual = require('../src/lib/bank/akahu.ts')
mock('./src/lib/bank/akahu.ts', {
  ...actual,
  Akahu: class {
    async identity() {
      providerCalls++
      return { id: 'user_one', earliestDate: '2024-01-01' }
    }
    async accounts() {
      providerCalls++
      return []
    }
    async account() {
      providerCalls++
      return { id: 'acc_one', name: 'Everyday', suffix: '0123' }
    }
  },
})
const { discoverBankAccounts, linkBankAccount } = require('../src/lib/actions/bank.ts')
test('setup actions reject other users/households and foreign accounts before provider access', async () => {
  for (const values of [
    [null, 'house', true],
    ['other', 'house', true],
    ['owner', 'other', true],
    ['owner', 'house', false],
  ]) {
    ;[uid, household, config] = values
    assert.equal((await discoverBankAccounts()).ok, false)
    assert.ok((await linkBankAccount('account', 'acc_one', '2026-01-01')).error)
  }
  assert.equal(providerCalls, 0)
  assert.equal(writes, 0)
  uid = 'owner'
  household = 'house'
  config = true
  accountOwned = false
  assert.ok((await linkBankAccount('foreign', 'acc_one', '2026-01-01')).error)
  assert.equal(providerCalls, 0)
  accountOwned = true
  assert.equal((await discoverBankAccounts()).ok, true)
  assert.equal((await linkBankAccount('account', 'acc_one', '2026-01-01')).error, null)
  assert.equal(writes, 1)
})
