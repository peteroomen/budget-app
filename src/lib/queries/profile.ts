import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

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
