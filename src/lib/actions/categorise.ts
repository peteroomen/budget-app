'use server'

import { revalidatePath } from 'next/cache'
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

  // 1. Fetch all account IDs for this household (needed to scope transaction queries)
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id')
    .eq('household_id', householdId)

  const accountIds = (accounts ?? []).map((a) => a.id as string)
  if (accountIds.length === 0) return { error: null, updated: 0 }

  // 2. Fetch all distinct merchant names across household transactions
  const { data: txRows } = await supabase
    .from('transactions')
    .select('merchant_name')
    .in('account_id', accountIds)
    .not('merchant_name', 'is', null)

  const merchantNames = [...new Set((txRows ?? []).map((r) => r.merchant_name as string))]
  if (merchantNames.length === 0) return { error: null, updated: 0 }

  // 3. Clear the existing merchant map so this is a clean AI-only run
  const { error: deleteError } = await supabase
    .from('merchant_category_map')
    .delete()
    .eq('household_id', householdId)

  if (deleteError) return { error: deleteError.message, updated: 0 }

  // 4. Ask Claude to categorise all merchants
  const categories = await getCategories()
  const categoryMap = await categoriseMerchantsWithClaude(merchantNames, categories)

  if (categoryMap.size === 0) return { error: null, updated: 0 }

  // 5. Upsert new merchant_category_map entries
  const mapRows = [...categoryMap.entries()].map(([merchant, categoryId]) => ({
    household_id: householdId,
    merchant_name: merchant,
    category_id: categoryId,
  }))

  const { error: upsertError } = await supabase
    .from('merchant_category_map')
    .upsert(mapRows, { onConflict: 'household_id,merchant_name' })

  if (upsertError) return { error: upsertError.message, updated: 0 }

  // 6. Apply new categories to transactions (one update per merchant)
  let updated = 0
  for (const [merchant, categoryId] of categoryMap) {
    const { error: txError } = await supabase
      .from('transactions')
      .update({ category_id: categoryId })
      .in('account_id', accountIds)
      .eq('merchant_name', merchant)

    if (txError) return { error: txError.message, updated }
    updated++
  }

  revalidatePath('/transactions')
  return { error: null, updated }
}
