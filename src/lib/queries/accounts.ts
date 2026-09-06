import { createClient } from '@/lib/supabase/server'
import { readAll } from './all-rows'
import type { Account } from '@/types'

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient()

  return readAll<Account>((from, to) =>
    supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true })
      .order('id')
      .range(from, to)
  )
}
