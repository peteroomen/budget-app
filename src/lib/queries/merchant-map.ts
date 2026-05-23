import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Batch-fetch merchant→category mappings for a household.
 * Returns a Map keyed by normalised merchant_name → category_id.
 * Filters to only the merchant names present in the given list so the query is bounded.
 */
export async function getMerchantMappingsForImport(
  supabase: SupabaseClient,
  householdId: string,
  merchantNames: string[]
): Promise<Map<string, string>> {
  if (merchantNames.length === 0) return new Map()

  const { data } = await supabase
    .from('merchant_category_map')
    .select('merchant_name, category_id')
    .eq('household_id', householdId)
    .in('merchant_name', merchantNames)

  const map = new Map<string, string>()
  for (const row of data ?? []) {
    map.set(row.merchant_name as string, row.category_id as string)
  }
  return map
}

/**
 * Returns the set of all normalised merchant names that have a mapping for
 * the current user's household. Used in the transaction list to show/hide the
 * "forget mapping" button.
 */
export async function getMappedMerchantNames(): Promise<Set<string>> {
  const supabase = await createClient()

  const { data } = await supabase.from('merchant_category_map').select('merchant_name')

  const names = new Set<string>()
  for (const row of data ?? []) {
    names.add(row.merchant_name as string)
  }
  return names
}
