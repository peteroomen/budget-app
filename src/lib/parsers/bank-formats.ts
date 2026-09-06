import { isValidDate, parseMoney, validDescription } from '../import/validation'
// Defines how to extract date/amount/description from each supported NZ bank CSV format.
// Detection is by required header presence — order doesn't matter.

export type ParsedRow = {
  date: string // ISO YYYY-MM-DD
  amount_cents: number // income positive, expense negative
  description: string // raw from statement
}

type RawRecord = Record<string, string>

export type BankFormat = {
  name: string
  // All of these headers must be present to match
  requiredHeaders: string[]
  parse: (row: RawRecord) => ParsedRow | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function col(row: RawRecord, key: string): string {
  return row[key] ?? ''
}

function parseDMY(s: string): string {
  // DD/MM/YYYY → YYYY-MM-DD
  if (!/^\d{1,2}\/\d{1,2}\/[1-9]\d{3}$/.test(s.trim())) return ''
  const parts = s.trim().split('/')
  const d = parts[0] ?? ''
  const m = parts[1] ?? ''
  const y = parts[2] ?? ''
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseYMD(s: string): string {
  // YYYY/MM/DD or YYYY-MM-DD → YYYY-MM-DD
  return s.trim().replace(/\//g, '-')
}

function parseAmount(s: string): number {
  return parseMoney(s) ?? NaN
}

function joinParts(parts: string[]): string {
  return parts
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')
}

// ─── ANZ NZ ──────────────────────────────────────────────────────────────────
// Headers: Type,Details,Particulars,Code,Reference,Amount,Date,ForeignCurrencyAmount,ConversionCharge
// Amount: negative = debit (expense), positive = credit (income) — matches our convention

const anz: BankFormat = {
  name: 'ANZ',
  requiredHeaders: ['Type', 'Details', 'Amount', 'Date'],
  parse(row) {
    const date = parseDMY(col(row, 'Date'))
    const amount_cents = parseAmount(col(row, 'Amount'))
    const description =
      joinParts([
        col(row, 'Details'),
        col(row, 'Particulars'),
        col(row, 'Code'),
        col(row, 'Reference'),
      ]) || col(row, 'Details')
    if (!isValidDate(date) || !Number.isFinite(amount_cents) || !validDescription(description))
      return null
    return { date, amount_cents, description }
  },
}

// ─── ASB NZ ──────────────────────────────────────────────────────────────────
// Headers: Date,Unique Id,Tran Type,Cheque Number,Payee,Memo,Amount
// Date: YYYY/MM/DD
// Amount: negative = debit, positive = credit

const asb: BankFormat = {
  name: 'ASB',
  requiredHeaders: ['Date', 'Unique Id', 'Tran Type', 'Payee', 'Amount'],
  parse(row) {
    const date = parseYMD(col(row, 'Date'))
    const amount_cents = parseAmount(col(row, 'Amount'))
    const description = joinParts([col(row, 'Payee'), col(row, 'Memo')]) || col(row, 'Payee')
    if (!isValidDate(date) || !Number.isFinite(amount_cents) || !validDescription(description))
      return null
    return { date, amount_cents, description }
  },
}

// ─── Westpac NZ ──────────────────────────────────────────────────────────────
// Headers: Date,Narration,Debit,Credit,Balance,Categories,Serial
// Debit: positive number = money out → store as negative cents
// Credit: positive number = money in → store as positive cents

const westpac: BankFormat = {
  name: 'Westpac',
  requiredHeaders: ['Date', 'Narration', 'Debit', 'Credit', 'Balance'],
  parse(row) {
    const date = parseDMY(col(row, 'Date'))
    const debit = col(row, 'Debit').trim()
    const credit = col(row, 'Credit').trim()
    const debitCents = debit === '' ? 0 : parseMoney(debit)
    const creditCents = credit === '' ? 0 : parseMoney(credit)
    if (
      debitCents === null ||
      creditCents === null ||
      debitCents < 0 ||
      creditCents < 0 ||
      (debitCents > 0 && creditCents > 0) ||
      (debit === '' && credit === '')
    )
      return null
    const amount_cents = creditCents - debitCents
    const description = col(row, 'Narration').trim()
    if (!isValidDate(date) || !Number.isFinite(amount_cents) || !validDescription(description))
      return null
    return { date, amount_cents, description }
  },
}

// ─── BNZ NZ ──────────────────────────────────────────────────────────────────
// Headers: Date,Amount,Payee,Particulars,Code,Reference,Account number
// Amount: negative = debit, positive = credit

const bnz: BankFormat = {
  name: 'BNZ',
  requiredHeaders: ['Date', 'Amount', 'Payee', 'Particulars', 'Account number'],
  parse(row) {
    const date = parseDMY(col(row, 'Date'))
    const amount_cents = parseAmount(col(row, 'Amount'))
    const description =
      joinParts([
        col(row, 'Payee'),
        col(row, 'Particulars'),
        col(row, 'Code'),
        col(row, 'Reference'),
      ]) || col(row, 'Payee')
    if (!isValidDate(date) || !Number.isFinite(amount_cents) || !validDescription(description))
      return null
    return { date, amount_cents, description }
  },
}

export const BANK_FORMATS: BankFormat[] = [anz, asb, westpac, bnz]
