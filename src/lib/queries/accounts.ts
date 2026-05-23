import { createClient } from '@/lib/supabase/server'
import type { Account } from '@/types'

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true })

  return data ?? []
}
