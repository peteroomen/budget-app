'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Akahu, BankError, addDays } from '@/lib/bank/akahu'
import { bankConfig } from '@/lib/bank/config'
import { bankService, runBankSync, safeBankError } from '@/lib/bank/sync'
import { isValidDate } from '@/lib/import/validation'
import { nzDate } from '@/lib/utils/month'

async function owner() {
  const config = bankConfig(false)
  if (!config) throw new BankError('unavailable')
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (user?.id !== config.ownerId) throw new BankError('unavailable')
  const { data: active, error } = await db.rpc('get_my_household_id')
  if (error || active !== config.householdId) throw new BankError('unavailable')
  return { config, db }
}
export async function discoverBankAccounts() {
  try {
    const { config } = await owner()
    const provider = new Akahu(config.appToken, config.userToken)
    const identity = await provider.identity()
    const accounts = await provider.accounts()
    return { ok: true as const, accounts, earliestDate: identity.earliestDate }
  } catch {
    return {
      ok: false as const,
      error: 'Unable to read Akahu accounts. Check the connection and server configuration.',
    }
  }
}
export async function linkBankAccount(accountId: string, externalId: string, cutover: string) {
  try {
    const { config, db } = await owner()
    if (!isValidDate(cutover) || cutover > nzDate()) throw new BankError('invalid_data')
    const { data: account, error } = await db
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .eq('household_id', config.householdId)
      .eq('currency', 'NZD')
      .single()
    if (error || !account) throw new BankError('invalid_data')
    const provider = new Akahu(config.appToken, config.userToken)
    const identity = await provider.identity()
    if (cutover < identity.earliestDate) throw new BankError('invalid_data')
    const external = await provider.account(externalId)
    const { error: writeError } = await bankService(config).rpc('link_bank_account', {
      p_owner: config.ownerId,
      p_household: config.householdId,
      p_account: accountId,
      p_user: identity.id,
      p_external: external.id,
      p_name: `${external.name}${external.suffix ? ` · ${external.suffix}` : ''}`,
      p_cutover: cutover,
    })
    if (writeError)
      return {
        error: 'This Tide or Akahu account may already be linked. Refresh and check the mapping.',
      }
    revalidatePath('/', 'layout')
    return { error: null }
  } catch {
    return { error: 'Unable to link this account. Check its connection and import start date.' }
  }
}
export async function setBankLinkEnabled(id: string, enabled: boolean) {
  try {
    const { config } = await owner()
    if (typeof enabled !== 'boolean') throw new BankError('invalid_data')
    const { data, error } = await bankService(config)
      .from('bank_links')
      .update({ enabled })
      .eq('id', id)
      .eq('owner_id', config.ownerId)
      .eq('household_id', config.householdId)
      .select('id')
      .single()
    if (error || !data) throw new BankError('unavailable')
    revalidatePath('/', 'layout')
    return { error: null }
  } catch {
    return { error: 'Unable to change this connection.' }
  }
}
export async function syncBankAccount(id: string) {
  try {
    await owner()
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new BankError('invalid_data')
    const result = await runBankSync(id)
    revalidatePath('/', 'layout')
    if (!result.results.length) return { error: 'This connection is paused or unavailable.' }
    if (result.results.some((r) => r.status === 'error'))
      return { error: 'Sync needs attention. Check the account status below.' }
    return { error: null, continuing: result.results.some((r) => r.status === 'continuing') }
  } catch (error) {
    return { error: `Sync could not complete (${safeBankError(error)}). Please retry.` }
  }
}
export async function suggestedCutover(accountId: string) {
  try {
    const { db } = await owner()
    const { data, error } = await db
      .from('transactions')
      .select('date')
      .eq('account_id', accountId)
      .in('source', ['csv', 'pdf'])
      .order('date', { ascending: false })
      .limit(1)
    if (error) throw new BankError('unavailable')
    const next = data?.[0] ? addDays(data[0].date, 1) : nzDate()
    return { date: next > nzDate() ? nzDate() : next }
  } catch {
    return { date: nzDate() }
  }
}
