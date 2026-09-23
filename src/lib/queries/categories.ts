import { createClient } from '@/lib/supabase/server'
import { readAll } from './all-rows'
import type { Category } from '@/types'

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()

  return readAll<Category>((from, to) =>
    supabase
      .from('categories')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name', { ascending: true })
      .order('id')
      .range(from, to)
  )
}
