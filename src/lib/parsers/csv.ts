import { MAX_IMPORT_ROWS } from '../import/validation'
import Papa from 'papaparse'
import { BANK_FORMATS, type BankFormat, type ParsedRow } from './bank-formats'

export type CsvParseResult =
  | { ok: true; format: string; rows: ParsedRow[] }
  | { ok: false; error: string }

export function parseCsv(csvText: string): CsvParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.errors.length > 0) {
    const msg = result.errors[0]?.message ?? 'Unknown parse error'
    return { ok: false, error: `CSV parse error: ${msg}` }
  }

  const headers: string[] = result.meta.fields ?? []
  const format = detectFormat(headers)
  if (!format) {
    return {
      ok: false,
      error: `Unrecognised CSV format. Headers found: ${headers.join(', ')}. Supported banks: ANZ, ASB, Westpac, BNZ.`,
    }
  }

  if (result.data.length > MAX_IMPORT_ROWS)
    return { ok: false, error: `Maximum ${MAX_IMPORT_ROWS} transactions per file.` }
  const rows: ParsedRow[] = []
  let rowNumber = 1
  for (const raw of result.data) {
    rowNumber++
    const parsed = format.parse(raw)
    if (!parsed)
      return {
        ok: false,
        error: `Invalid date, amount or description on CSV row ${rowNumber}. No transactions were imported.`,
      }
    rows.push(parsed)
  }

  if (rows.length === 0) {
    return { ok: false, error: 'No valid transactions found in file.' }
  }

  return { ok: true, format: format.name, rows }
}

function detectFormat(headers: string[]): BankFormat | null {
  const headerSet = new Set(headers)
  return BANK_FORMATS.find((fmt) => fmt.requiredHeaders.every((h) => headerSet.has(h))) ?? null
}
