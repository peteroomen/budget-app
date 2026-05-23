'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseCsv } from '@/lib/parsers/csv'
import { normaliseMerchant } from '@/lib/parsers/normalise'

export type ImportResult = {
  error: string | null
  inserted?: number
  duplicates?: number
  format?: string
}

function dedupeKey(
  accountId: string,
  date: string,
  amountCents: number,
  description: string
): string {
  return crypto
    .createHash('sha256')
    .update(`${accountId}|${date}|${amountCents}|${description}`)
    .digest('hex')
}

export async function importCsv(
  _prevState: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  const accountId = formData.get('account_id')
  const file = formData.get('file')

  if (typeof accountId !== 'string' || !accountId) return { error: 'Account is required' }
  if (!(file instanceof File) || file.size === 0) return { error: 'No file selected' }
  if (!file.name.endsWith('.csv')) return { error: 'Only CSV files are supported' }

  const csvText = await file.text()
  const parsed = parseCsv(csvText)
  if (!parsed.ok) return { error: parsed.error }

  const supabase = await createClient()

  // Verify the account belongs to the current user's household (RLS will enforce, but
  // we want a clear error rather than a silent empty result)
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .maybeSingle()

  if (!account) return { error: 'Account not found' }

  // Fetch existing transactions for this account to detect duplicates
  const { data: existing } = await supabase
    .from('transactions')
    .select('date, amount_cents, description')
    .eq('account_id', accountId)

  const existingKeys = new Set(
    (existing ?? []).map((t) => dedupeKey(accountId, t.date, t.amount_cents, t.description))
  )

  const toInsert = parsed.rows
    .filter(
      (row) => !existingKeys.has(dedupeKey(accountId, row.date, row.amount_cents, row.description))
    )
    .map((row) => ({
      account_id: accountId,
      date: row.date,
      amount_cents: row.amount_cents,
      description: row.description,
      merchant_name: normaliseMerchant(row.description),
      source: 'csv' as const,
    }))

  const duplicates = parsed.rows.length - toInsert.length

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('transactions').insert(toInsert)
    if (insertError) return { error: insertError.message }
  }

  // Record the upload
  await supabase.from('uploads').insert({
    account_id: accountId,
    filename: file.name,
    file_type: 'csv',
    row_count: parsed.rows.length,
    status: 'complete',
  })

  revalidatePath('/transactions')
  revalidatePath('/import')

  return {
    error: null,
    inserted: toInsert.length,
    duplicates,
    format: parsed.format,
  }
}
