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

  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name: trimmed })
    .select('id')
    .single()

  if (householdError || !household) {
    return { id: null, error: householdError?.message ?? 'Could not create household' }
  }

  const { error: memberError } = await supabase
    .from('household_members')
    .insert({ user_id: user.id, household_id: household.id, role: 'owner' })

  if (memberError) {
    return { id: null, error: memberError.message }
  }

  const { error: seedError } = await supabase.rpc('seed_default_categories', {
    p_household_id: household.id,
  })

  if (seedError) {
    return { id: null, error: seedError.message }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ household_id: household.id })
    .eq('id', user.id)

  if (profileError) {
    return { id: null, error: profileError.message }
  }

  revalidatePath('/', 'layout')
  return { id: household.id, error: null }
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
