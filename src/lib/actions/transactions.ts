'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertMerchantMapping } from '@/lib/actions/merchant-map'

type ActionResult = { error: string | null }

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/transactions')
  return { error: null }
}

export async function deleteAllTransactions(): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== 'admin') return { error: 'Not authorised' }

  const { data: accounts } = await supabase.from('accounts').select('id')
  const accountIds = (accounts ?? []).map((a) => a.id as string)

  if (accountIds.length > 0) {
    const { error } = await supabase.from('transactions').delete().in('account_id', accountIds)
    if (error) return { error: error.message }
  }

  revalidatePath('/transactions')
  return { error: null }
}

// Empty/whitespace-only note clears the column (writes null).
export async function setTransactionNote(id: string, note: string): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = note.trim().slice(0, 500)
  const value = trimmed.length === 0 ? null : trimmed

  const { error } = await supabase.from('transactions').update({ notes: value }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/summary')
  revalidatePath('/chat')
  return { error: null }
}

// null categoryId clears the transaction category without touching the merchant map.
export async function setCategoryOverride(
  transactionId: string,
  merchantName: string | null,
  categoryId: string | null
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, category_source: categoryId ? 'manual' : null })
    .eq('id', transactionId)

  if (error) return { error: error.message }

  if (categoryId && merchantName) {
    const mapResult = await upsertMerchantMapping(merchantName, categoryId, true)
    if (mapResult.error) return { error: mapResult.error }
  }

  revalidatePath('/transactions')
  return { error: null }
}
