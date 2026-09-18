'use server'

import { readAll } from '@/lib/queries/all-rows'
import {
  MAX_FILE_BYTES,
  MAX_IMPORT_ROWS,
  isValidDate,
  isCents,
  validDescription,
} from '@/lib/import/validation'
import { selectNewOccurrences } from '@/lib/import/duplicates'
import Anthropic from '@anthropic-ai/sdk'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseCsv } from '@/lib/parsers/csv'
import { normaliseMerchant } from '@/lib/parsers/normalise'
import { getMerchantMappingsForImport } from '@/lib/queries/merchant-map'
import { getCategories } from '@/lib/queries/categories'
import { categoriseMerchantsWithClaude } from '@/lib/categorise'
import type { AnalyseResult, AnalysedTransaction, CommitResult } from '@/lib/types/import'

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
    validDescription((value as ParsedTransaction).description) &&
    isValidDate((value as ParsedTransaction).date) &&
    Number.isFinite((value as ParsedTransaction).amount) &&
    isCents(toCents((value as ParsedTransaction).amount)) &&
    Math.abs(
      (value as ParsedTransaction).amount * 100 - toCents((value as ParsedTransaction).amount)
    ) < 0.00001
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

  if (response.stop_reason !== 'end_turn')
    return { error: 'PDF extraction was incomplete. Try a smaller statement or CSV export.' }
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
    return { error: 'Could not parse transactions from this PDF — try again or use a CSV export' }
  }

  if (!Array.isArray(parsed)) return { error: 'Claude did not return a JSON array' }

  if (parsed.length > MAX_IMPORT_ROWS || !parsed.every(isParsedTransaction))
    return { error: 'PDF contains invalid or too many transactions. Please use a CSV export.' }
  const transactions = parsed as ParsedTransaction[]
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
  try {
    return await analyse(formData)
  } catch {
    return { ok: false, error: 'Unable to analyse this file. Please retry or use a CSV export.' }
  }
}

async function analyse(formData: FormData): Promise<AnalyseResult> {
  const accountId = formData.get('account_id')
  const file = formData.get('file')

  if (typeof accountId !== 'string' || !accountId)
    return { ok: false, error: 'Account is required' }
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'No file selected' }

  if (file.size > MAX_FILE_BYTES) return { ok: false, error: 'Files must be 4 MB or smaller.' }
  if (file.name.length > 255) return { ok: false, error: 'Filename is too long.' }
  const name = file.name.toLowerCase()
  const isCsv = name.endsWith('.csv')
  const isPdf = name.endsWith('.pdf')
  if (!isCsv && !isPdf) return { ok: false, error: 'Only CSV and PDF files are supported' }

  const fileType: 'csv' | 'pdf' = isCsv ? 'csv' : 'pdf'
  const supabase = await createClient()

  const { data: account } = await supabase
    .from('accounts')
    .select('id, household_id')
    .eq('id', accountId)
    .maybeSingle()

  if (!account) return { ok: false, error: 'Account not found' }

  const parseResult = isCsv ? await handleCsv(file) : await handlePdf(file)
  if ('error' in parseResult) return { ok: false, error: parseResult.error }

  const existing = await readAll<{ date: string; amount_cents: number; description: string }>(
    (from, to) =>
      supabase
        .from('transactions')
        .select('date, amount_cents, description')
        .eq('account_id', accountId)
        .order('id')
        .range(from, to)
  )
  const allRows = parseResult.rows
  const newRows = selectNewOccurrences(allRows, existing)
  const newRowSet = new Set(newRows)
  const duplicates = allRows.length - newRows.length

  const householdId = account.household_id as string
  const normalisedNames = allRows.map((row) => normaliseMerchant(row.description))
  const uniqueNames = [...new Set(normalisedNames)]
  const merchantMap = await getMerchantMappingsForImport(supabase, householdId, uniqueNames)

  // Build analysed transactions with map-based categories applied
  const analysedRows: AnalysedTransaction[] = allRows.map((row) => {
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
        .filter((r, i) => newRowSet.has(allRows[i]!) && r.categoryId === null && r.merchantName)
        .map((r) => r.merchantName as string)
    ),
  ]

  const warnings: string[] = []
  if (unmappedMerchants.length > 0) {
    try {
      const categories = await getCategories()
      const aiMap = await categoriseMerchantsWithClaude(unmappedMerchants, categories)

      for (const row of analysedRows) {
        if (row.categoryId === null && row.merchantName) {
          const aiCategory = aiMap.get(row.merchantName) ?? null
          row.categoryId = aiCategory
          if (aiCategory) row.categorySource = 'claude'
        }
      }
    } catch {
      warnings.push(
        'Automatic categorisation is unavailable. You can still import and categorise transactions later.'
      )
    }
  }

  const previewRows = analysedRows.filter((_, i) => newRowSet.has(allRows[i]!))
  const fromMap = previewRows.filter((r) => r.categorySource === 'map').length
  const fromClaude = previewRows.filter((r) => r.categorySource === 'claude').length
  const uncategorised = previewRows.filter((r) => r.categoryId === null).length

  const { data: draftId, error: stageError } = await supabase.rpc('stage_import', {
    p_account: accountId,
    p_rows: analysedRows,
    p_filename: file.name,
    p_file_type: fileType,
    p_format: parseResult.format,
  })
  if (stageError || typeof draftId !== 'string')
    return { ok: false, error: 'Unable to save the import preview. Please retry.' }
  return {
    ok: true,
    draftId,
    warnings,
    transactions: previewRows,
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

export async function commitImport(draftId: string): Promise<CommitResult> {
  if (typeof draftId !== 'string' || !/^[0-9a-f-]{36}$/i.test(draftId))
    return { error: 'Invalid import preview' }
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('commit_import', { p_draft: draftId })
    if (error || !data)
      return {
        error:
          'Unable to confirm import. Retry this preview; if it has expired, analyse the file again.',
      }
    for (const path of ['/transactions', '/import', '/dashboard', '/budgets', '/summary', '/chat'])
      revalidatePath(path)
    return { error: null, stats: data }
  } catch {
    return { error: 'Import confirmation could not be verified. Retry this preview safely.' }
  }
}
