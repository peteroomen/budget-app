import { createClient } from '@/lib/supabase/server'
import type { Account } from '@/types'

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) console.error('getAccounts:', error.message)
  return data ?? []
}
