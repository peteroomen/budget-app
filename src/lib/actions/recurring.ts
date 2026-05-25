'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { error: string | null }

export async function detectRecurring(): Promise<ActionResult & { flagged: number }> {
  const supabase = await createClient()

  // Fetch all expense transactions with a merchant name
  const { data, error } = await supabase
    .from('transactions')
    .select('id, merchant_name, amount_cents, date')
    .lt('amount_cents', 0)
    .not('merchant_name', 'is', null)

  if (error) return { error: error.message, flagged: 0 }

  const rows = (data ?? []) as Array<{
    id: string
    merchant_name: string
    amount_cents: number
    date: string
  }>

  // Group by merchant_name
  const byMerchant = new Map<string, Array<{ id: string; amount_cents: number; month: string }>>()

  for (const row of rows) {
    const month = row.date.slice(0, 7) // YYYY-MM
    const existing = byMerchant.get(row.merchant_name)
    if (existing) {
      existing.push({ id: row.id, amount_cents: row.amount_cents, month })
    } else {
      byMerchant.set(row.merchant_name, [{ id: row.id, amount_cents: row.amount_cents, month }])
    }
  }

  const recurringIds: string[] = []
  const nonRecurringIds: string[] = []

  for (const [, txs] of byMerchant) {
    const distinctMonths = new Set(txs.map((t) => t.month))

    if (distinctMonths.size < 2) {
      nonRecurringIds.push(...txs.map((t) => t.id))
      continue
    }

    // Check amount similarity: all within 10% of the max absolute amount
    const amounts = txs.map((t) => Math.abs(t.amount_cents))
    const maxAmt = Math.max(...amounts)
    const minAmt = Math.min(...amounts)
    const withinTenPct = maxAmt === 0 || (maxAmt - minAmt) / maxAmt <= 0.1

    if (withinTenPct) {
      recurringIds.push(...txs.map((t) => t.id))
    } else {
      nonRecurringIds.push(...txs.map((t) => t.id))
    }
  }

  // Batch update recurring and non-recurring in parallel
  const updateRecurring =
    recurringIds.length > 0
      ? supabase.from('transactions').update({ is_recurring: true }).in('id', recurringIds)
      : null
  const updateNonRecurring =
    nonRecurringIds.length > 0
      ? supabase.from('transactions').update({ is_recurring: false }).in('id', nonRecurringIds)
      : null

  const [r1, r2] = await Promise.all([
    updateRecurring ? Promise.resolve(await updateRecurring) : Promise.resolve({ error: null }),
    updateNonRecurring
      ? Promise.resolve(await updateNonRecurring)
      : Promise.resolve({ error: null }),
  ])

  if (r1.error) return { error: r1.error.message, flagged: 0 }
  if (r2.error) return { error: r2.error.message, flagged: 0 }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { error: null, flagged: recurringIds.length }
}

export async function toggleRecurring(
  transactionId: string,
  isRecurring: boolean
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('transactions')
    .update({ is_recurring: isRecurring })
    .eq('id', transactionId)

  if (error) return { error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { error: null }
}
