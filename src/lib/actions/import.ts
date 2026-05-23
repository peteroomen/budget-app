'use server'

import crypto from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
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

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
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

Extract all transactions and return ONLY a valid JSON array. No markdown, no code blocks, no explanation.

Each object must have exactly:
- "date": ISO date string YYYY-MM-DD
- "amount": number in NZD — negative for debits (money out), positive for credits (money in, e.g. salary, refunds)
- "description": merchant/payee name exactly as in the statement

Exclude opening balance, closing balance, and any summary rows — only real transactions.`,
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
    return {
      error: `Claude returned invalid JSON. Raw response (first 300 chars): ${raw.slice(0, 300)}`,
    }
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
    .select('id')
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

  const toInsert = result.rows
    .filter(
      (row) => !existingKeys.has(dedupeKey(accountId, row.date, row.amount_cents, row.description))
    )
    .map((row) => ({
      account_id: accountId,
      date: row.date,
      amount_cents: row.amount_cents,
      description: row.description,
      merchant_name: normaliseMerchant(row.description),
      source: (isCsv ? 'csv' : 'pdf') as 'csv' | 'pdf',
    }))

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
