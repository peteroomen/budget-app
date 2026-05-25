'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { error: string | null }

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

export async function upsertMerchantMapping(
  merchantName: string,
  categoryId: string,
  isManual: boolean = false
): Promise<ActionResult> {
  const supabase = await createClient()
  const householdId = await getHouseholdId()
  if (!householdId) return { error: 'No household found' }

  const { error } = await supabase.from('merchant_category_map').upsert(
    {
      household_id: householdId,
      merchant_name: merchantName,
      category_id: categoryId,
      is_manual: isManual,
    },
    { onConflict: 'household_id,merchant_name' }
  )

  if (error) return { error: error.message }

  revalidatePath('/transactions')
  return { error: null }
}

export async function deleteMerchantMapping(merchantName: string): Promise<ActionResult> {
  const supabase = await createClient()
  const householdId = await getHouseholdId()
  if (!householdId) return { error: 'No household found' }

  const { error } = await supabase
    .from('merchant_category_map')
    .delete()
    .eq('household_id', householdId)
    .eq('merchant_name', merchantName)

  if (error) return { error: error.message }

  revalidatePath('/transactions')
  return { error: null }
}
