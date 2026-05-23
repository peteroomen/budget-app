'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AccountType } from '@/types'

export async function createAccount(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const name = formData.get('name')
  const institution = formData.get('institution')
  const type = formData.get('type')

  if (typeof name !== 'string' || !name.trim()) return { error: 'Account name is required' }
  if (typeof type !== 'string') return { error: 'Account type is required' }

  const validTypes: AccountType[] = ['spending', 'saving']
  if (!validTypes.includes(type as AccountType)) return { error: 'Invalid account type' }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.household_id) return { error: 'No household found' }

  const { error } = await supabase.from('accounts').insert({
    household_id: profile.household_id,
    name: name.trim(),
    institution: typeof institution === 'string' && institution.trim() ? institution.trim() : null,
    type: type as AccountType,
    currency: 'NZD',
  })

  if (error) return { error: error.message }

  revalidatePath('/accounts')
  return { error: null }
}

export async function deleteAccount(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase.from('accounts').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/accounts')
  return { error: null }
}
