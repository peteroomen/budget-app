import { createClient } from '@/lib/supabase/server'
import type { Profile, UserContext } from '@/types'

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  if (error) console.error('getCurrentProfile:', error.message)
  return data
}

interface MembershipRow {
  household_id: string
  households: { id: string; name: string } | null
}

export async function getCurrentUserContext(): Promise<UserContext | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) console.error('getCurrentUserContext profile:', profileError.message)
  if (!profile) return null

  const { data: memberships, error: membershipsError } = await supabase
    .from('household_members')
    .select('household_id, households(id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (membershipsError)
    console.error('getCurrentUserContext memberships:', membershipsError.message)

  const rows = (memberships ?? []) as unknown as MembershipRow[]
  const list = rows
    .filter(
      (row): row is MembershipRow & { households: { id: string; name: string } } =>
        row.households !== null
    )
    .map((row) => ({ id: row.households.id, name: row.households.name }))

  const active = list.find((m) => m.id === profile.household_id) ?? null

  return {
    profile,
    activeHouseholdId: active?.id ?? null,
    activeHouseholdName: active?.name ?? null,
    memberships: list,
    isAdmin: user.app_metadata?.role === 'admin',
  }
}
