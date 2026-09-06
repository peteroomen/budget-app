const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync, readdirSync } = require('node:fs')
const { PGlite } = require('@electric-sql/pglite')

test('migrations, household boundaries and atomic imports in PostgreSQL', async (t) => {
  const db = new PGlite()
  t.after(() => db.close())
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema public, auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    alter default privileges in schema public grant all on tables to authenticated, anon;
  `)
  for (const file of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    try {
      await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'))
    } catch (e) {
      throw new Error(`Migration ${file}: ${e.message}`, { cause: e })
    }
  }
  const u1 = '11111111-1111-4111-8111-111111111111'
  const u2 = '22222222-2222-4222-8222-222222222222'
  await db.query('insert into auth.users(id,email) values ($1,$2),($3,$4)', [
    u1,
    'one@example.test',
    u2,
    'two@example.test',
  ])
  const asUser = async (id) => {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
    await db.exec('set role authenticated')
  }
  const value = async (sql, params = []) => (await db.query(sql, params)).rows[0]
  await asUser(u1)
  const h1 = (await value("select create_household('One') as id")).id
  const a1 = (
    await value(
      "insert into accounts(household_id,name,type) values ($1,'ANZ','spending') returning id",
      [h1]
    )
  ).id
  const c1 = (await value("select id from categories where type='expense' limit 1")).id
  await asUser(u2)
  const h2 = (await value("select create_household('Two') as id")).id
  const a2 = (
    await value(
      "insert into accounts(household_id,name,type) values ($1,'Other','spending') returning id",
      [h2]
    )
  ).id
  const c2 = (await value("select id from categories where type='expense' limit 1")).id
  await asUser(u1)

  await t.test(
    'prevents self-enrolment, arbitrary category seeding and cross-household references',
    async () => {
      await assert.rejects(
        db.query('insert into household_members(household_id,user_id) values ($1,$2)', [h2, u1]),
        /row-level security/
      )
      await assert.rejects(
        db.query('select seed_default_categories($1)', [h2]),
        /permission denied/
      )
      await assert.rejects(
        db.query(
          "insert into transactions(account_id,date,amount_cents,description,category_id) values ($1,'2026-09-01',-100,'test',$2)",
          [a1, c2]
        ),
        /Category does not belong/
      )
      await assert.rejects(
        db.query('insert into budgets(household_id,category_id,amount_cents) values ($1,$2,100)', [
          h1,
          c2,
        ]),
        /Category does not belong/
      )
      await assert.rejects(
        db.query(
          "insert into merchant_category_map(household_id,merchant_name,category_id) values ($1,'foreign',$2)",
          [h1, c2]
        ),
        /Category does not belong/
      )
      assert.equal((await db.query('select * from accounts where id=$1', [a2])).rows.length, 0)
      await assert.rejects(
        db.query("insert into uploads(filename,file_type) values ('orphan','csv')"),
        /row-level security/
      )
      await assert.rejects(db.query('select * from import_drafts'), /permission denied/)
    }
  )
  const row = {
    date: '2026-09-01',
    amountCents: -1250,
    description: 'COFFEE',
    merchantName: 'COFFEE',
    categoryId: c1,
    categorySource: 'claude',
    source: 'csv',
  }
  const stage = async (rows, account = a1) =>
    (
      await value("select stage_import($1,$2,'statement.csv','csv','ANZ') as id", [
        account,
        JSON.stringify(rows),
      ])
    ).id
  const commit = async (id) => (await value('select commit_import($1) as result', [id])).result
  await t.test('validates untrusted preview input', async () => {
    for (const changes of [
      { date: '2026-02-30' },
      { amountCents: 1.5 },
      { amountCents: 2147483648 },
      { description: '' },
      { source: 'pdf' },
      { categoryId: c2 },
      { merchantName: 12 },
    ]) {
      await assert.rejects(stage([{ ...row, ...changes }]))
    }
    await assert.rejects(stage([row], a2), /Account not found/)
    await assert.rejects(stage([]), /Invalid import/)
  })
  await t.test(
    'preserves identical occurrences and deduplicates retries and overlapping previews',
    async () => {
      const first = await stage([row, row])
      const overlap = await stage([row, row, row])
      const result = await commit(first)
      assert.equal(result.newCount, 2)
      assert.deepEqual(await commit(first), result)
      assert.equal((await commit(overlap)).newCount, 1)
      assert.equal((await commit(await stage([row, row, row]))).newCount, 0)
      assert.equal((await value('select count(*)::int as n from transactions')).n, 3)
      assert.equal((await value('select count(*)::int as n from import_history')).n, 3)
      await asUser(u2)
      await assert.rejects(commit(first), /preview not found/)
      await asUser(u1)
    }
  )
  await t.test('rolls back transactions, mappings and history together on failure', async () => {
    const draft = await stage([{ ...row, description: 'ROLLBACK', merchantName: 'ROLLBACK' }])
    await db.exec(`reset role; create function public.fail_history() returns trigger language plpgsql as $$ begin raise exception 'injected failure'; end $$;
      create trigger fail_history before insert on import_history for each row execute function fail_history(); set role authenticated;`)
    await assert.rejects(commit(draft), /injected failure/)
    assert.equal(
      (await value("select count(*)::int as n from transactions where description='ROLLBACK'")).n,
      0
    )
    assert.equal(
      (
        await value(
          "select count(*)::int as n from merchant_category_map where merchant_name='ROLLBACK'"
        )
      ).n,
      0
    )
    await db.exec(
      'reset role; drop trigger fail_history on import_history; set role authenticated;'
    )
    assert.equal((await commit(draft)).newCount, 1)
  })
  await t.test(
    'human category edits win over stale previews and automatic recategorisation',
    async () => {
      const draft = await stage([{ ...row, description: 'AFTER EDIT' }])
      const tx = (await value('select id from transactions limit 1')).id
      const other = (
        await value("select id from categories where type='expense' and id<>$1 limit 1", [c1])
      ).id
      await db.query('select set_transaction_category($1,$2)', [tx, other])
      await commit(draft)
      assert.equal(
        (await value("select category_id from transactions where description='AFTER EDIT'"))
          .category_id,
        other
      )
      await db.query('select apply_automatic_categories($1)', [
        JSON.stringify([{ merchant: 'COFFEE', categoryId: c1 }]),
      ])
      assert.equal(
        (await value('select category_id from transactions where id=$1', [tx])).category_id,
        other
      )
      await db.query("delete from merchant_category_map where merchant_name='COFFEE'")
      await db.query('select apply_automatic_categories($1)', [
        JSON.stringify([{ merchant: 'COFFEE', categoryId: c1 }]),
      ])
      assert.equal(
        (await value('select category_id from transactions where id=$1', [tx])).category_id,
        other
      )
      await db.query('select set_transaction_category($1,null)', [tx])
      await db.query('select apply_automatic_categories($1)', [
        JSON.stringify([{ merchant: 'COFFEE', categoryId: c1 }]),
      ])
      assert.equal(
        (await value('select category_id from transactions where id=$1', [tx])).category_id,
        null
      )
    }
  )
  await t.test('manual recurring opt-out survives detection', async () => {
    const tx = (await value('select id from transactions limit 1')).id
    await db.query(
      "update transactions set is_recurring=false,recurring_source='manual' where id=$1",
      [tx]
    )
    await db.query('select apply_recurring_detection($1,$2)', [[tx], []])
    assert.equal(
      (await value('select is_recurring from transactions where id=$1', [tx])).is_recurring,
      false
    )
  })
  await t.test('snapshot contains more than 1000 rows and only the active household', async () => {
    await db.query(
      "insert into transactions(account_id,date,amount_cents,description,category_id) select $1,'2026-09-02',-100,'Large import '||i,$2 from generate_series(1,1200) i",
      [a1, c1]
    )
    const snap = (await value("select financial_snapshot('2026-09-01','2026-09-30') as s")).s
    assert.equal(snap.transactions.length, 1205)
    assert.equal(snap.household.id, h1)
    assert.ok(snap.transactions.every((t) => t.account_id === a1))
    await asUser(u2)
    const other = (await value("select financial_snapshot('2026-09-01','2026-09-30') as s")).s
    assert.equal(other.transactions.length, 0)
    await asUser(u1)
  })
})
