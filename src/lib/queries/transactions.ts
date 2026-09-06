import { readAll } from './all-rows'
import { monthDateRange } from '@/lib/utils/month'
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

  const rows = await readAll<TransactionRow>((from, to) => {
    let query = supabase
      .from('transactions')
      .select('*, account:accounts(name, institution), category:categories(name, type)')
      .order(sortBy, { ascending: sortDir === 'asc' })
      .order('id')

    if (month) {
      const range = monthDateRange(month)
      query = query.gte('date', range.dateFrom).lte('date', range.dateTo)
    } else {
      if (dateFrom) query = query.gte('date', dateFrom)
      if (dateTo) query = query.lte('date', dateTo)
    }

    if (accountId) {
      query = query.eq('account_id', accountId)
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    return query.range(from, to).returns<TransactionRow[]>()
  })
  // Local matching avoids PostgREST filter syntax injection and searches both visible fields.
  const term = search?.trim().toLocaleLowerCase()
  return term
    ? rows.filter((row) =>
        `${row.merchant_name ?? ''} ${row.description}`.toLocaleLowerCase().includes(term)
      )
    : rows
}
