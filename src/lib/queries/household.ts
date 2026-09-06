import { createClient } from '@/lib/supabase/server'

export interface HouseholdSettings {
  id: string
  name: string
  expected_monthly_income_cents: number | null
}

export async function getHouseholdSettings(): Promise<HouseholdSettings | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) throw new Error('Household is unavailable. Please retry.')
  if (!profile?.household_id) return null

  const { data, error } = await supabase
    .from('households')
    .select('id, name, expected_monthly_income_cents')
    .eq('id', profile.household_id)
    .maybeSingle()

  if (error) {
    throw new Error('Household is unavailable. Please retry.')
  }
  return data
}
