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

export async function upsertBudget(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const categoryId = formData.get('category_id')
  const month = formData.get('month')
  const amountCentsRaw = formData.get('amount_cents')

  if (typeof categoryId !== 'string' || !categoryId) return { error: 'Category is required' }
  if (typeof month !== 'string' || !month) return { error: 'Month is required' }
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
      month,
      amount_cents: amountCents,
    },
    { onConflict: 'household_id,category_id,month' }
  )

  if (error) return { error: error.message }

  revalidatePath('/budgets')
  return { error: null }
}
