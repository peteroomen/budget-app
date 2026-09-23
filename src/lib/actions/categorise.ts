'use server'

import { revalidatePath } from 'next/cache'
import { readAll } from '@/lib/queries/all-rows'
import { createClient } from '@/lib/supabase/server'
import { getCategories } from '@/lib/queries/categories'
import { categoriseMerchantsWithClaude } from '@/lib/categorise'

export type RecategoriseResult = { error: string | null; updated: number }

async function getHouseholdId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .maybeSingle()

  return data?.household_id ?? null
}

export async function recategoriseAll(): Promise<RecategoriseResult> {
  const supabase = await createClient()
  const householdId = await getHouseholdId()
  if (!householdId) return { error: 'No household found', updated: 0 }

  try {
    const txRows = await readAll<{ merchant_name: string | null }>((from, to) =>
      supabase
        .from('transactions')
        .select('merchant_name')
        .not('merchant_name', 'is', null)
        .or('category_source.is.null,category_source.neq.manual')
        .order('id')
        .range(from, to)
    )
    const manualRows = await readAll<{ merchant_name: string }>((from, to) =>
      supabase
        .from('merchant_category_map')
        .select('merchant_name')
        .eq('is_manual', true)
        .order('id')
        .range(from, to)
    )
    const manual = new Set(manualRows.map((r) => r.merchant_name))
    const names = [
      ...new Set(
        txRows.map((r) => r.merchant_name).filter((n): n is string => !!n && !manual.has(n))
      ),
    ]
    if (!names.length) return { error: null, updated: 0 }
    const categories = await getCategories()
    const categoryMap = await categoriseMerchantsWithClaude(names, categories)
    const { data, error } = await supabase.rpc('apply_automatic_categories', {
      p_mappings: [...categoryMap].map(([merchant, categoryId]) => ({ merchant, categoryId })),
    })
    if (error) return { error: 'Categories could not be saved. Please retry.', updated: 0 }
    revalidatePath('/', 'layout')
    return { error: null, updated: data ?? 0 }
  } catch {
    return {
      error: 'Automatic categorisation is unavailable. Your existing categories have been kept.',
      updated: 0,
    }
  }
}
