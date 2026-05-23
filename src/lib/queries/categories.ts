import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/types'

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  return data ?? []
}
