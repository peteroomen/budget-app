import { createClient } from '@/lib/supabase/server'

export type TransactionSortBy = 'date' | 'amount_cents' | 'merchant_name'
export type SortDir = 'asc' | 'desc'

export interface TransactionFilters {
  accountId?: string
  /** YYYY-MM — when set, overrides dateFrom/dateTo and scopes to the full calendar month */
  month?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  categoryId?: string
  sortBy?: TransactionSortBy
  sortDir?: SortDir
}

export interface TransactionRow {
  id: string
  account_id: string
  date: string
  amount_cents: number
  description: string
  merchant_name: string | null
  category_id: string | null
  category_source: string | null
  is_recurring: boolean
  notes: string | null
  source: string | null
  created_at: string
  updated_at: string
  account: { name: string; institution: string | null } | null
  category: { name: string; type: string } | null
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<TransactionRow[]> {
  const supabase = await createClient()
  const {
    accountId,
    month,
    dateFrom,
    dateTo,
    search,
    categoryId,
    sortBy = 'date',
    sortDir = 'desc',
  } = filters

  let query = supabase
    .from('transactions')
    .select('*, account:accounts(name, institution), category:categories(name, type)')
    .order(sortBy, { ascending: sortDir === 'asc' })

  if (month) {
    // Scope to the full calendar month, e.g. "2026-05" → [2026-05-01, 2026-06-01)
    const [yearStr, mStr] = month.split('-')
    const year = parseInt(yearStr ?? '0', 10)
    const m = parseInt(mStr ?? '1', 10)
    const firstDay = `${year}-${String(m).padStart(2, '0')}-01`
    const nextMonthYear = m === 12 ? year + 1 : year
    const nextMonthM = m === 12 ? 1 : m + 1
    const nextMonthFirst = `${nextMonthYear}-${String(nextMonthM).padStart(2, '0')}-01`
    query = query.gte('date', firstDay).lt('date', nextMonthFirst)
  } else {
    if (dateFrom) query = query.gte('date', dateFrom)
    if (dateTo) query = query.lte('date', dateTo)
  }

  if (accountId) {
    query = query.eq('account_id', accountId)
  }
  if (search) {
    query = query.ilike('merchant_name', `%${search}%`)
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query
  if (error) console.error('getTransactions:', error.message)
  return (data as TransactionRow[]) ?? []
}
