'use server'

import { revalidatePath } from 'next/cache'
import { readAll } from '@/lib/queries/all-rows'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { error: string | null }

export async function detectRecurring(): Promise<ActionResult & { flagged: number }> {
  const supabase = await createClient()

  try {
    type Row = {
      id: string
      merchant_name: string
      account_id: string
      amount_cents: number
      date: string
      category: { type: string } | null
    }
    const rows = await readAll<Row>((from, to) =>
      supabase
        .from('transactions')
        .select('id, merchant_name, account_id, amount_cents, date, category:categories(type)')
        .lt('amount_cents', 0)
        .not('merchant_name', 'is', null)
        .order('id')
        .range(from, to)
        .returns<Row[]>()
    )

    // Group by merchant_name
    const byMerchant = new Map<string, Array<{ id: string; amount_cents: number; month: string }>>()

    for (const row of rows) {
      if (row.category?.type === 'transfer' || row.category?.type === 'income') continue
      const merchantKey = JSON.stringify([row.account_id, row.merchant_name])
      const month = row.date.slice(0, 7) // YYYY-MM
      const existing = byMerchant.get(merchantKey)
      if (existing) {
        existing.push({ id: row.id, amount_cents: row.amount_cents, month })
      } else {
        byMerchant.set(merchantKey, [{ id: row.id, amount_cents: row.amount_cents, month }])
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

    const { data: flagged, error } = await supabase.rpc('apply_recurring_detection', {
      p_recurring: recurringIds,
      p_not_recurring: nonRecurringIds,
    })
    if (error) return { error: 'Recurring detection could not be saved. Please retry.', flagged: 0 }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    return { error: null, flagged: flagged ?? 0 }
  } catch {
    return { error: 'Recurring detection is unavailable. Please retry.', flagged: 0 }
  }
}

export async function toggleRecurring(
  transactionId: string,
  isRecurring: boolean
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('transactions')
    .update({ is_recurring: isRecurring, recurring_source: 'manual' })
    .eq('id', transactionId)

  if (error) return { error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { error: null }
}
