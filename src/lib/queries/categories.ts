import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/types'

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  if (error) console.error('getCategories:', error.message)
  return data ?? []
}
