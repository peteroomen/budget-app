const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync, readdirSync } = require('node:fs')
const { PGlite } = require('@electric-sql/pglite')
const { nzDate } = require('../src/lib/utils/month.ts')
const { nzMidnight } = require('../src/lib/bank/akahu.ts')

test('bank imports reconcile atomically and preserve household boundaries and user choices', async (t) => {
  const db = new PGlite()
  t.after(() => db.close())
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
  `)
  for (const file of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'))
  const value = async (sql, args = []) => (await db.query(sql, args)).rows[0]
  const user = '11111111-1111-4111-8111-111111111111'
  const other = '22222222-2222-4222-8222-222222222222'
  const asUser = async (id = user) => {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
    await db.exec('set role authenticated')
  }
  const service = () => db.exec('reset role; set role service_role')
  await db.query('insert into auth.users(id,email) values ($1,$2),($3,$4)', [
    user,
    'one@example.test',
    other,
    'two@example.test',
  ])
  await asUser()
  const household = (await value("select create_household('One') id")).id
  const account = (
    await value(
      "insert into accounts(household_id,name,type) values ($1,'ANZ','spending') returning id",
      [household]
    )
  ).id
  const category = (await value("select id from categories where type='expense' limit 1")).id
  await asUser(other)
  const foreign = (await value("select create_household('Two') id")).id
  const foreignAccount = (
    await value(
      "insert into accounts(household_id,name,type) values ($1,'Other','spending') returning id",
      [foreign]
    )
  ).id
  const day = nzDate()
  const refreshed = new Date().toISOString()
  const row = (id, amount = -100, description = 'COFFEE') => ({
    id: `trans_${id}`,
    accountId: 'acc_one',
    date: day,
    timestamp: new Date(nzMidnight(day) + 3600000).toISOString(),
    updatedAt: refreshed,
    amountCents: amount,
    description,
    merchant: description,
  })
  const linkAccount = async (a = account) =>
    (
      await value("select link_bank_account($1,$2,$3,'user_one','acc_one','ANZ',$4) id", [
        user,
        household,
        a,
        day,
      ])
    ).id
  const claim = async () =>
    (await value("select claim_bank_sync($1,'recent',$2) r", [link, refreshed])).r
  const stage = async (run, rows, next = null, cursor = null) =>
    db.query('select stage_bank_page($1,$2,$3,$4,$5)', [
      run.id,
      run.lease,
      cursor,
      next,
      JSON.stringify(rows),
    ])
  const finish = async (run, stamp = refreshed) =>
    (await value('select finish_bank_sync($1,$2,$3) r', [run.id, run.lease, stamp])).r
  const reconcile = async (rows) => {
    const r = await claim()
    await stage(r, rows)
    return finish(r)
  }
  const count = async () =>
    (
      await value(
        'select count(*)::int n from transactions where account_id=$1 and bank_removed_at is null',
        [account]
      )
    ).n
  let link

  await t.test(
    'only service can map verified owned accounts; household status remains isolated',
    async () => {
      await asUser()
      await assert.rejects(linkAccount(), /permission denied/)
      await service()
      await assert.rejects(linkAccount(foreignAccount), /not authorised/)
      link = await linkAccount()
      await assert.rejects(linkAccount(), /unique constraint/)
      await asUser(other)
      assert.equal((await db.query('select * from bank_links')).rows.length, 0)
      await assert.rejects(db.query('select * from bank_records'), /permission denied/)
      await asUser()
      assert.equal((await db.query('select * from bank_links')).rows.length, 1)
      await assert.rejects(claim(), /permission denied/)
      await service()
    }
  )
  await t.test(
    'partial pages cannot change totals; resume has a new lease and completion is idempotent',
    async () => {
      const run = await claim()
      assert.equal(await claim(), null)
      await stage(run, [row('one')], 'next')
      assert.equal(await count(), 0)
      await assert.rejects(finish(run), /Incomplete/)
      await assert.rejects(stage(run, [], 'next', 'next'), /Repeated cursor/)
      await db.query('update bank_sync_runs set lease=null,lease_until=null where id=$1', [run.id])
      await assert.rejects(stage({ ...run, lease: null }, [], null, 'next'), /Stale/)
      const resumed = await claim()
      assert.equal(resumed.id, run.id)
      assert.equal(resumed.cursor, 'next')
      assert.notEqual(resumed.lease, run.lease)
      await assert.rejects(stage(run, [], null, 'next'), /Stale/)
      await stage(resumed, [row('two', -200)], null, 'next')
      await assert.rejects(
        finish(resumed, new Date(Date.parse(refreshed) + 1000).toISOString()),
        /Provider changed/
      )
      const result = await finish(resumed)
      assert.equal(result.inserted, 2)
      assert.deepEqual(await finish(resumed), result)
      assert.equal(await count(), 2)
    }
  )
  await t.test(
    'corrections preserve annotations; complete-window removals disappear from financial snapshots',
    async () => {
      await asUser()
      const tx = (await value('select id from transactions where amount_cents=-100')).id
      await db.query('select set_transaction_category($1,$2)', [tx, category])
      await db.query(
        "update transactions set notes='Keep me',is_recurring=true,recurring_source='manual' where id=$1",
        [tx]
      )
      await service()
      const result = await reconcile([row('one', -150)])
      assert.equal(result.updated, 1)
      assert.equal(result.removed, 1)
      await asUser()
      const updated = await value('select * from transactions where id=$1', [tx])
      assert.equal(updated.amount_cents, -150)
      assert.equal(updated.notes, 'Keep me')
      assert.equal(updated.category_id, category)
      assert.equal(updated.category_source, 'manual')
      assert.equal(updated.is_recurring, true)
      assert.equal(updated.recurring_source, 'manual')
      assert.equal(updated.bank_revision, 2)
      const snap = (await value('select financial_snapshot($1,$1) s', [day])).s
      assert.equal(snap.transactions.length, 1)
      await service()
    }
  )
  await t.test('user-deleted bank rows do not resurrect on repeat sync', async () => {
    await asUser()
    await db.query('delete from transactions where amount_cents=-150')
    await service()
    await reconcile([row('one', -155)])
    assert.equal(await count(), 0)
    const record = await value(
      "select hidden_at,transaction_id from bank_records where provider_id='trans_one'"
    )
    assert.ok(record.hidden_at)
    assert.equal(record.transaction_id, null)
  })
  await t.test(
    'file fallback ignores removed bank records and exact overlap adopts existing annotations',
    async () => {
      await asUser()
      const file = {
        date: day,
        amountCents: -200,
        description: 'COFFEE',
        merchantName: 'COFFEE',
        categoryId: category,
        categorySource: 'claude',
        source: 'csv',
      }
      const draft = (
        await value("select stage_import($1,$2,'test.csv','csv','ANZ') id", [
          account,
          JSON.stringify([file]),
        ])
      ).id
      assert.equal((await value('select commit_import($1) r', [draft])).r.newCount, 1)
      await db.query("update transactions set notes='Statement note' where source='csv'")
      await service()
      // A replacement provider ID can adopt the statement row; the old ID remains removed.
      await reconcile([row('replacement', -200)])
      assert.equal(await count(), 1)
      const adopted = await value(
        'select source,notes,category_id from transactions where bank_removed_at is null'
      )
      assert.equal(adopted.source, 'bank')
      assert.equal(adopted.notes, 'Statement note')
      assert.equal(adopted.category_id, category)
    }
  )
  await t.test('ambiguous statement overlaps roll back the entire window', async () => {
    await asUser()
    await db.query(
      "insert into transactions(account_id,date,amount_cents,description,source) values ($1,$2,-500,'FILE DESCRIPTION','csv')",
      [account, day]
    )
    await service()
    const run = await claim()
    await stage(run, [row('aaa', -777), row('conflict', -500, 'DIFFERENT BANK DESCRIPTION')])
    await assert.rejects(finish(run), /Ambiguous statement overlap/)
    assert.equal(
      (await value('select count(*)::int n from transactions where amount_cents=-777')).n,
      0
    )
    assert.equal(await count(), 2)
    await db.query(
      "update bank_sync_runs set state='abandoned',lease=null,lease_until=null where id=$1",
      [run.id]
    )
  })
  await t.test('pause and revoked membership prevent committing staged data', async () => {
    const run = await claim()
    await stage(run, [])
    await db.query('update bank_links set enabled=false where id=$1', [link])
    await assert.rejects(finish(run), /not authorised/)
    assert.equal(await count(), 2)
    await db.query('update bank_links set enabled=true where id=$1', [link])
    await db.query('delete from household_members where user_id=$1 and household_id=$2', [
      user,
      household,
    ])
    await assert.rejects(finish(run), /not authorised/)
    await assert.rejects(claim(), /not authorised/)
    assert.equal(await count(), 2)
  })
})
