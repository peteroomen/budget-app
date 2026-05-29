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
import type {
  AnalyseResult,
  AnalysedTransaction,
  CommitResult,
  AnalyseSuccess,
} from '@/lib/types/import'

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

type ParsedTransaction = { date: string; amount: number; description: string }

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

export async function analyseImport(formData: FormData): Promise<AnalyseResult> {
  const accountId = formData.get('account_id')
  const file = formData.get('file')

  if (typeof accountId !== 'string' || !accountId)
    return { ok: false, error: 'Account is required' }
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'No file selected' }

  const name = file.name.toLowerCase()
  const isCsv = name.endsWith('.csv')
  const isPdf = name.endsWith('.pdf')
  if (!isCsv && !isPdf) return { ok: false, error: 'Only CSV and PDF files are supported' }

  const fileType: 'csv' | 'pdf' = isCsv ? 'csv' : 'pdf'
  const parseResult = isCsv ? await handleCsv(file) : await handlePdf(file)
  if ('error' in parseResult) return { ok: false, error: parseResult.error }

  const supabase = await createClient()

  const { data: account } = await supabase
    .from('accounts')
    .select('id, household_id')
    .eq('id', accountId)
    .maybeSingle()

  if (!account) return { ok: false, error: 'Account not found' }

  const { data: existing } = await supabase
    .from('transactions')
    .select('date, amount_cents, description')
    .eq('account_id', accountId)

  const existingKeys = new Set(
    (existing ?? []).map((t) => dedupeKey(accountId, t.date, t.amount_cents, t.description))
  )

  const allRows = parseResult.rows
  const duplicates = allRows.filter((row) =>
    existingKeys.has(dedupeKey(accountId, row.date, row.amount_cents, row.description))
  ).length

  const newRows = allRows.filter(
    (row) => !existingKeys.has(dedupeKey(accountId, row.date, row.amount_cents, row.description))
  )

  const householdId = account.household_id as string
  const normalisedNames = newRows.map((row) => normaliseMerchant(row.description))
  const uniqueNames = [...new Set(normalisedNames)]
  const merchantMap = await getMerchantMappingsForImport(supabase, householdId, uniqueNames)

  // Build analysed transactions with map-based categories applied
  const analysedRows: AnalysedTransaction[] = newRows.map((row) => {
    const merchant = normaliseMerchant(row.description)
    const categoryId = merchantMap.get(merchant) ?? null
    return {
      date: row.date,
      amountCents: row.amount_cents,
      description: row.description,
      merchantName: merchant,
      categoryId,
      categorySource: (categoryId ? 'map' : null) as 'map' | null,
      source: fileType,
    }
  })

  // Call Claude to categorise merchants not found in the map
  const unmappedMerchants = [
    ...new Set(
      analysedRows
        .filter((r) => r.categoryId === null && r.merchantName)
        .map((r) => r.merchantName as string)
    ),
  ]

  const newMerchantMappings: { merchantName: string; categoryId: string }[] = []

  if (unmappedMerchants.length > 0) {
    const categories = await getCategories()
    const aiMap = await categoriseMerchantsWithClaude(unmappedMerchants, categories)

    for (const row of analysedRows) {
      if (row.categoryId === null && row.merchantName) {
        const aiCategory = aiMap.get(row.merchantName) ?? null
        row.categoryId = aiCategory
        if (aiCategory) row.categorySource = 'claude'
      }
    }

    for (const [merchantName, categoryId] of aiMap.entries()) {
      newMerchantMappings.push({ merchantName, categoryId })
    }
  }

  const fromMap = analysedRows.filter((r) => r.categorySource === 'map').length
  const fromClaude = analysedRows.filter((r) => r.categorySource === 'claude').length
  const uncategorised = analysedRows.filter((r) => r.categoryId === null).length

  return {
    ok: true,
    transactions: analysedRows,
    newMerchantMappings,
    stats: {
      newCount: newRows.length,
      duplicates,
      fromMap,
      fromClaude,
      uncategorised,
    },
    format: parseResult.format,
    fileType,
    accountId,
    filename: file.name,
  }
}

export async function commitImport(params: Omit<AnalyseSuccess, 'ok'>): Promise<CommitResult> {
  const { transactions, newMerchantMappings, stats, format, fileType, accountId, filename } = params

  const supabase = await createClient()

  const { data: account } = await supabase
    .from('accounts')
    .select('id, household_id')
    .eq('id', accountId)
    .maybeSingle()

  if (!account) return { error: 'Account not found' }

  const householdId = account.household_id as string

  if (transactions.length > 0) {
    const rows = transactions.map((t) => ({
      account_id: accountId,
      date: t.date,
      amount_cents: t.amountCents,
      description: t.description,
      merchant_name: t.merchantName,
      category_id: t.categoryId,
      category_source: t.categorySource,
      source: t.source,
    }))
    const { error: insertError } = await supabase.from('transactions').insert(rows)
    if (insertError) return { error: insertError.message }
  }

  if (newMerchantMappings.length > 0) {
    const mapRows = newMerchantMappings.map(({ merchantName, categoryId }) => ({
      household_id: householdId,
      merchant_name: merchantName,
      category_id: categoryId,
      is_manual: false,
    }))
    await supabase
      .from('merchant_category_map')
      .upsert(mapRows, { onConflict: 'household_id,merchant_name' })
  }

  const bankFormat = fileType === 'csv' ? format : null

  await supabase.from('import_history').insert({
    household_id: householdId,
    account_id: accountId,
    filename,
    file_type: fileType,
    bank_format: bankFormat,
    imported_count: stats.newCount,
    duplicates_count: stats.duplicates,
    from_map_count: stats.fromMap,
    from_claude_count: stats.fromClaude,
    uncategorised_count: stats.uncategorised,
  })

  revalidatePath('/transactions')
  revalidatePath('/import')

  return { error: null, stats }
}
