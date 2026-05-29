import { createClient } from '@/lib/supabase/server'

export interface ImportHistoryRow {
  id: string
  filename: string
  file_type: string
  bank_format: string | null
  imported_count: number
  duplicates_count: number
  from_map_count: number
  from_claude_count: number
  uncategorised_count: number
  imported_at: string
  account_name: string | null
}

export async function getRecentImportHistory(limit = 5): Promise<ImportHistoryRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('import_history')
    .select(
      `id, filename, file_type, bank_format,
       imported_count, duplicates_count, from_map_count, from_claude_count, uncategorised_count,
       imported_at,
       accounts(name)`
    )
    .order('imported_at', { ascending: false })
    .limit(limit)

  if (error) console.error('getRecentImportHistory:', error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    filename: row.filename,
    file_type: row.file_type,
    bank_format: row.bank_format,
    imported_count: row.imported_count,
    duplicates_count: row.duplicates_count,
    from_map_count: row.from_map_count,
    from_claude_count: row.from_claude_count,
    uncategorised_count: row.uncategorised_count,
    imported_at: row.imported_at,
    account_name: Array.isArray(row.accounts)
      ? ((row.accounts[0] as { name: string } | undefined)?.name ?? null)
      : ((row.accounts as { name: string } | null)?.name ?? null),
  }))
}
