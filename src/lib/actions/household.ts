'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { error: string | null }

export async function updateExpectedMonthlyIncome(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = formData.get('expected_monthly_income_cents')
  if (typeof raw !== 'string') return { error: 'Amount is required' }

  let value: number | null
  if (raw.trim() === '') {
    value = null
  } else {
    const parsed = parseInt(raw, 10)
    if (isNaN(parsed) || parsed < 0) return { error: 'Amount must be a positive number' }
    value = parsed
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.household_id) return { error: 'No household found' }

  const { error } = await supabase
    .from('households')
    .update({ expected_monthly_income_cents: value })
    .eq('id', profile.household_id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/budgets')
  return { error: null }
}
