'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type CreateResult = { id: string | null; error: string | null }
type SwitchResult = { error: string | null }

export async function createHousehold(name: string): Promise<CreateResult> {
  const trimmed = name.trim()
  if (trimmed.length === 0) return { id: null, error: 'Name is required' }
  if (trimmed.length > 64) return { id: null, error: 'Name must be 64 characters or fewer' }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { id: null, error: 'Not authenticated' }

  const { data, error } = await supabase.rpc('create_household', { p_name: trimmed })

  if (error) return { id: null, error: error.message }

  revalidatePath('/', 'layout')
  return { id: (data as string | null) ?? null, error: null }
}

export async function switchHousehold(householdId: string): Promise<SwitchResult> {
  if (typeof householdId !== 'string' || householdId.length === 0) {
    return { error: 'Invalid household' }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: membership, error: lookupError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .eq('household_id', householdId)
    .maybeSingle()

  if (lookupError) return { error: lookupError.message }
  if (!membership) return { error: 'Not a member of that household' }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ household_id: householdId })
    .eq('id', user.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/', 'layout')
  return { error: null }
}
