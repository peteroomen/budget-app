import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Filters to only the provided names so the query is bounded, not a full-table scan.
export async function getMerchantMappingsForImport(
  supabase: SupabaseClient,
  householdId: string,
  merchantNames: string[]
): Promise<Map<string, string>> {
  if (merchantNames.length === 0) return new Map()

  const { data, error } = await supabase
    .from('merchant_category_map')
    .select('merchant_name, category_id')
    .eq('household_id', householdId)
    .in('merchant_name', merchantNames)

  if (error) console.error('getMerchantMappingsForImport:', error.message)
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    if (row.merchant_name && row.category_id) {
      map.set(row.merchant_name, row.category_id)
    }
  }
  return map
}

export async function getMappedMerchantNames(): Promise<Set<string>> {
  const supabase = await createClient()

  const { data, error } = await supabase.from('merchant_category_map').select('merchant_name')

  if (error) console.error('getMappedMerchantNames:', error.message)
  const names = new Set<string>()
  for (const row of data ?? []) {
    if (row.merchant_name) names.add(row.merchant_name)
  }
  return names
}
