import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Budget, Category, Household } from '@/types'

export interface FinancialTransaction {
  id: string
  account_id: string
  date: string
  amount_cents: number
  merchant_name: string | null
  description: string
  notes: string | null
  category_id: string | null
  is_recurring: boolean
  category: Pick<Category, 'name' | 'color' | 'type'> | null
}

export interface FinancialSnapshot {
  transactions: FinancialTransaction[]
  categories: Category[]
  budgets: Budget[]
  household: Household
}

/** One database snapshot; JSON aggregation is not capped by PostgREST's row limit. */
export const getFinancialSnapshot = cache(
  async (from: string, to: string): Promise<FinancialSnapshot> => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('financial_snapshot', { p_from: from, p_to: to })
    if (error || !data) throw new Error('Financial data is unavailable. Please retry.')
    return data as FinancialSnapshot
  }
)
