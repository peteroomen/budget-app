// =============================================================================
// Shared TypeScript types for the Budget App
// These mirror the Supabase schema. Once supabase gen types is available,
// these can be replaced or augmented with generated types.
// =============================================================================

export type AccountType = 'spending' | 'saving'
export type UploadStatus = 'pending' | 'processing' | 'complete' | 'error'
export type FileType = 'csv' | 'pdf'
export type TransactionSource = 'csv' | 'pdf'
export type CategorySource = 'claude' | 'manual' | 'map'
export type CategoryType = 'income' | 'expense' | 'transfer'

export interface Household {
  id: string
  name: string
  expected_monthly_income_cents: number | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  household_id: string | null
  email: string
  display_name: string | null
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  household_id: string
  name: string
  institution: string | null
  currency: string
  type: AccountType
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  household_id: string
  name: string
  color: string | null
  icon: string | null
  is_system: boolean
  type: CategoryType
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  account_id: string
  date: string
  amount_cents: number
  description: string
  merchant_name: string | null
  category_id: string | null
  category_source: CategorySource | null
  is_recurring: boolean
  notes: string | null
  source: TransactionSource | null
  created_at: string
  updated_at: string
}

export interface MerchantCategoryMap {
  id: string
  household_id: string
  merchant_name: string
  category_id: string
  is_manual: boolean
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  household_id: string
  category_id: string
  month: string // YYYY-MM
  amount_cents: number
  created_at: string
  updated_at: string
}

export interface Upload {
  id: string
  account_id: string | null
  filename: string
  file_type: FileType
  uploaded_at: string
  row_count: number | null
  status: UploadStatus
  created_at: string
  updated_at: string
}
