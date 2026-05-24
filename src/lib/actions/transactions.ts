'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertMerchantMapping } from '@/lib/actions/merchant-map'

type ActionResult = { error: string | null }

// null categoryId clears the transaction category without touching the merchant map.
export async function setCategoryOverride(
  transactionId: string,
  merchantName: string | null,
  categoryId: string | null
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId })
    .eq('id', transactionId)

  if (error) return { error: error.message }

  if (categoryId && merchantName) {
    const mapResult = await upsertMerchantMapping(merchantName, categoryId)
    if (mapResult.error) return { error: mapResult.error }
  }

  revalidatePath('/transactions')
  return { error: null }
}
