import { createClient } from '@/lib/supabase/server'

export type TransactionSortBy = 'date' | 'amount_cents' | 'merchant_name'
export type SortDir = 'asc' | 'desc'

export interface TransactionFilters {
  accountId?: string
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
  category: { name: string } | null
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<TransactionRow[]> {
  const supabase = await createClient()
  const {
    accountId,
    dateFrom,
    dateTo,
    search,
    categoryId,
    sortBy = 'date',
    sortDir = 'desc',
  } = filters

  let query = supabase
    .from('transactions')
    .select('*, account:accounts(name, institution), category:categories(name)')
    .order(sortBy, { ascending: sortDir === 'asc' })

  if (accountId) {
    query = query.eq('account_id', accountId)
  }
  if (dateFrom) {
    query = query.gte('date', dateFrom)
  }
  if (dateTo) {
    query = query.lte('date', dateTo)
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
