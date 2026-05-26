'use server'

import crypto from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseCsv } from '@/lib/parsers/csv'
import { normaliseMerchant } from '@/lib/parsers/normalise'
import { getMerchantMappingsForImport } from '@/lib/queries/merchant-map'
import { getCategories } from '@/lib/queries/categories'
import { categoriseMerchantsWithClaude } from '@/lib/categorise'

export type ImportResult = {
  error: string | null
  inserted?: number
  duplicates?: number
  format?: string
}

type ParsedTransaction = {
  date: string
  amount: number
  description: string
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

function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}

function isParsedTransaction(value: unknown): value is ParsedTransaction {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ParsedTransaction).date === 'string' &&
    typeof (value as ParsedTransaction).amount === 'number' &&
    typeof (value as ParsedTransaction).description === 'string'
  )
}

async function handleCsv(
  accountId: string,
  file: File
): Promise<
  | { rows: { date: string; amount_cents: number; description: string }[]; format: string }
  | { error: string }
> {
  const csvText = await file.text()
  const parsed = parseCsv(csvText)
  if (!parsed.ok) return { error: parsed.error }
  return { rows: parsed.rows, format: parsed.format }
}

async function handlePdf(
  file: File
): Promise<
  | { rows: { date: string; amount_cents: number; description: string }[]; format: string }
  | { error: string }
> {
  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  // Prefer TIDE_ANTHROPIC_API_KEY (Claude Desktop shadows ANTHROPIC_API_KEY with empty on macOS);
  // fall back to ANTHROPIC_API_KEY for Vercel production where only the standard name is set.
  const client = new Anthropic({
    apiKey: process.env.TIDE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: `You are a bank statement parser for New Zealand bank statements.

Extract all transactions and return ONLY a valid JSON array. No markdown, no code blocks, no explanation, no whitespace or indentation — compact single-line JSON only.

Each object must have exactly these keys:
- "date": ISO date string YYYY-MM-DD
- "amount": number in NZD — negative for debits (money out), positive for credits (money in, e.g. salary, refunds)
- "description": merchant/payee name exactly as in the statement

Exclude opening balance, closing balance, and any summary rows — only real transactions.

Example of the required format (compact, no whitespace):
[{"date":"2024-01-15","amount":-42.50,"description":"COUNTDOWN"},{"date":"2024-01-16","amount":1500.00,"description":"SALARY"}]`,
          },
        ],
      },
    ],
  })

  const first = response.content[0]
  if (!first || first.type !== 'text') return { error: 'Unexpected response from Claude' }

  // Claude sometimes wraps JSON in markdown fences despite being asked not to — strip them
  const raw = first.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.error('[importPdf] Claude response failed JSON.parse. Raw response:\n', raw)
    return { error: 'Could not parse transactions from this PDF — try again or use a CSV export' }
  }

  if (!Array.isArray(parsed)) return { error: 'Claude did not return a JSON array' }

  const transactions = parsed.filter(isParsedTransaction)
  if (transactions.length === 0) return { error: 'No transactions found in this PDF' }

  return {
    rows: transactions.map((tx) => ({
      date: tx.date,
      amount_cents: toCents(tx.amount),
      description: tx.description,
    })),
    format: 'PDF',
  }
}

export async function importStatement(
  _prevState: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  const accountId = formData.get('account_id')
  const file = formData.get('file')

  if (typeof accountId !== 'string' || !accountId) return { error: 'Account is required' }
  if (!(file instanceof File) || file.size === 0) return { error: 'No file selected' }

  const name = file.name.toLowerCase()
  const isCsv = name.endsWith('.csv')
  const isPdf = name.endsWith('.pdf')
  if (!isCsv && !isPdf) return { error: 'Only CSV and PDF files are supported' }

  const result = isCsv ? await handleCsv(accountId, file) : await handlePdf(file)
  if ('error' in result) return { error: result.error }

  const supabase = await createClient()

  const { data: account } = await supabase
    .from('accounts')
    .select('id, household_id')
    .eq('id', accountId)
    .maybeSingle()

  if (!account) return { error: 'Account not found' }

  const { data: existing } = await supabase
    .from('transactions')
    .select('date, amount_cents, description')
    .eq('account_id', accountId)

  const existingKeys = new Set(
    (existing ?? []).map((t) => dedupeKey(accountId, t.date, t.amount_cents, t.description))
  )

  const normalisedNames = result.rows.map((row) => normaliseMerchant(row.description))
  const uniqueNames = [...new Set(normalisedNames)]
  const householdId = account.household_id as string
  const merchantMap = await getMerchantMappingsForImport(supabase, householdId, uniqueNames)

  const toInsert = result.rows
    .filter(
      (row) => !existingKeys.has(dedupeKey(accountId, row.date, row.amount_cents, row.description))
    )
    .map((row) => {
      const merchant = normaliseMerchant(row.description)
      const categoryId = merchantMap.get(merchant) ?? null
      return {
        account_id: accountId,
        date: row.date,
        amount_cents: row.amount_cents,
        description: row.description,
        merchant_name: merchant,
        category_id: categoryId,
        category_source: (categoryId ? 'map' : null) as 'claude' | 'map' | null,
        source: (isCsv ? 'csv' : 'pdf') as 'csv' | 'pdf',
      }
    })

  // Call Claude to categorise merchants not found in the map
  const unmappedNames = [
    ...new Set(toInsert.filter((r) => r.category_id === null).map((r) => r.merchant_name)),
  ]

  if (unmappedNames.length > 0) {
    const categories = await getCategories()
    const aiMap = await categoriseMerchantsWithClaude(unmappedNames, categories)

    // Apply AI categories to rows and build new merchant_category_map entries
    for (const row of toInsert) {
      if (row.category_id === null && row.merchant_name) {
        const aiCategory = aiMap.get(row.merchant_name) ?? null
        row.category_id = aiCategory
        if (aiCategory) row.category_source = 'claude'
      }
    }

    if (aiMap.size > 0) {
      const mapRows = [...aiMap.entries()].map(([merchant, categoryId]) => ({
        household_id: householdId,
        merchant_name: merchant,
        category_id: categoryId,
        is_manual: false,
      }))
      await supabase
        .from('merchant_category_map')
        .upsert(mapRows, { onConflict: 'household_id,merchant_name' })
    }
  }

  const duplicates = result.rows.length - toInsert.length

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('transactions').insert(toInsert)
    if (insertError) return { error: insertError.message }
  }

  await supabase.from('uploads').insert({
    account_id: accountId,
    filename: file.name,
    file_type: isCsv ? 'csv' : 'pdf',
    row_count: result.rows.length,
    status: 'complete',
  })

  revalidatePath('/transactions')
  revalidatePath('/import')

  return {
    error: null,
    inserted: toInsert.length,
    duplicates,
    format: result.format,
  }
}
