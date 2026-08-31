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

/**
 * Sets a category's budget cap. Caps are global — one per category, applying to every
 * month — so there is no month to scope the write to.
 */
export async function upsertBudget(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const categoryId = formData.get('category_id')
  const amountCentsRaw = formData.get('amount_cents')

  if (typeof categoryId !== 'string' || !categoryId) return { error: 'Category is required' }
  if (typeof amountCentsRaw !== 'string' || !amountCentsRaw) return { error: 'Amount is required' }

  const amountCents = parseInt(amountCentsRaw, 10)
  if (isNaN(amountCents) || amountCents < 0) return { error: 'Amount must be a positive number' }

  const householdId = await getHouseholdId()
  if (!householdId) return { error: 'No household found' }

  const supabase = await createClient()
  const { error } = await supabase.from('budgets').upsert(
    {
      household_id: householdId,
      category_id: categoryId,
      amount_cents: amountCents,
    },
    { onConflict: 'household_id,category_id' }
  )

  if (error) return { error: error.message }

  revalidatePath('/budgets')
  revalidatePath('/dashboard')
  return { error: null }
}

/**
 * Clears a category's cap entirely. With global caps there is otherwise no way to unset
 * one — previously you simply didn't carry it into the next month.
 */
export async function deleteBudget(categoryId: string): Promise<ActionResult> {
  if (!categoryId) return { error: 'Category is required' }

  const householdId = await getHouseholdId()
  if (!householdId) return { error: 'No household found' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('household_id', householdId)
    .eq('category_id', categoryId)

  if (error) return { error: error.message }

  revalidatePath('/budgets')
  revalidatePath('/dashboard')
  return { error: null }
}
