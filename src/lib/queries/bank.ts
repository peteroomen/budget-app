import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { bankConfig } from '@/lib/bank/config'
import type { BankLink } from '@/lib/bank/status'

export const getBankSettings = cache(async () => {
  const db = await createClient()
  const [
    {
      data: { user },
    },
    { data: householdId, error: householdError },
  ] = await Promise.all([db.auth.getUser(), db.rpc('get_my_household_id')])
  const config = bankConfig(false)
  const canManage = !!config && user?.id === config.ownerId && householdId === config.householdId
  const { data, error } = await db.from('bank_links').select('*').order('created_at')
  return {
    links: (data ?? []) as BankLink[],
    canManage,
    scheduled: !!bankConfig(),
    error: !!error || !!householdError,
  }
})
