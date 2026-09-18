import { createClient as supabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { Akahu, BankError } from './akahu'
import { bankConfig } from './config'
import type { BankLink } from './status'

export interface SyncRun {
  id: string
  lease: string
  cursor: string | null
  complete_pages: boolean
  date_from: string
  date_to: string
  refreshed_at: string
}
export function bankService(config: NonNullable<ReturnType<typeof bankConfig>>) {
  return supabaseClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
export function safeBankError(error: unknown): string {
  if (error instanceof BankError) return error.code
  return 'unavailable'
}
async function rpc<T>(
  db: SupabaseClient,
  name: string,
  params: Record<string, unknown>
): Promise<T> {
  const { data, error } = await db.rpc(name, params)
  if (error)
    throw new BankError(
      error.message.includes('Ambiguous statement overlap') ? 'overlap' : 'unavailable'
    )
  return data as T
}
/** Injected provider and DB permit synthetic end-to-end tests with no bank or paid AI calls. */
export async function syncLink(
  db: SupabaseClient,
  provider: Akahu,
  link: BankLink,
  deadline = Date.now() + 40000
) {
  let run: SyncRun | null = null
  try {
    const identity = await provider.identity()
    if (identity.id !== link.provider_user_id || link.cutover_date < identity.earliestDate)
      throw new BankError('reconnect')
    for (const kind of ['recent', 'history']) {
      if (Date.now() > deadline - 10000) return { status: 'continuing' as const }
      const account = await provider.account(link.provider_account_id)
      run = await rpc<SyncRun | null>(db, 'claim_bank_sync', {
        p_link: link.id,
        p_kind: kind,
        p_refresh: account.refreshedAt,
      })
      if (!run) continue
      let pages = 0
      while (!run.complete_pages && pages < 12 && Date.now() < deadline - 10000) {
        const page = await provider.page(
          link.provider_account_id,
          run.date_from,
          run.date_to,
          run.cursor
        )
        await rpc(db, 'stage_bank_page', {
          p_run: run.id,
          p_lease: run.lease,
          p_cursor: run.cursor,
          p_next: page.next,
          p_rows: page.rows,
        })
        run.cursor = page.next
        run.complete_pages = page.next === null
        pages++
      }
      if (!run.complete_pages) {
        const { error } = await db
          .from('bank_sync_runs')
          .update({ lease: null, lease_until: null })
          .eq('id', run.id)
          .eq('lease', run.lease)
        if (error) throw new BankError('unavailable')
        return { status: 'continuing' as const }
      }
      const after = await provider.account(link.provider_account_id)
      if (after.refreshedAt !== account.refreshedAt) throw new BankError('changed')
      await rpc(db, 'finish_bank_sync', {
        p_run: run.id,
        p_lease: run.lease,
        p_refresh: after.refreshedAt,
      })
      run = null
    }
    return { status: 'complete' as const }
  } catch (error) {
    const code = safeBankError(error)
    const { error: statusError } = await db
      .from('bank_links')
      .update({ error_code: code })
      .eq('id', link.id)
    if (run) {
      // Keep successful pages for retry; a changed refresh timestamp resets them on the next claim.
      const { error: releaseError } = await db
        .from('bank_sync_runs')
        .update({ lease: null, lease_until: null })
        .eq('id', run.id)
        .eq('lease', run.lease)
      if (releaseError) return { status: 'error' as const, code: 'unavailable' }
    }
    return { status: 'error' as const, code: statusError ? 'unavailable' : code }
  }
}
export async function runBankSync(onlyLink?: string) {
  const config = bankConfig()
  if (!config) return { disabled: true, results: [] }
  const db = bankService(config)
  const { data: membership, error: membershipError } = await db
    .from('household_members')
    .select('user_id')
    .eq('household_id', config.householdId)
    .eq('user_id', config.ownerId)
    .maybeSingle()
  if (membershipError || !membership) throw new BankError('reconnect')
  let query = db
    .from('bank_links')
    .select('*')
    .eq('household_id', config.householdId)
    .eq('owner_id', config.ownerId)
    .eq('enabled', true)
  if (onlyLink) query = query.eq('id', onlyLink)
  const { data, error } = await query
    .order('last_success_at', { ascending: true, nullsFirst: true })
    .order('id')
    .limit(10)
  if (error) throw new BankError('unavailable')
  const provider = new Akahu(config.appToken, config.userToken)
  const results = []
  const deadline = Date.now() + 45000
  for (const link of (data ?? []) as BankLink[]) {
    if (Date.now() > deadline - 18000) break
    results.push({ id: link.id, ...(await syncLink(db, provider, link, deadline)) })
  }
  return { disabled: false, results }
}
