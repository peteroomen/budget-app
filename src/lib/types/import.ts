export interface AnalysedTransaction {
  date: string
  amountCents: number
  description: string
  merchantName: string | null
  categoryId: string | null
  categorySource: 'map' | 'claude' | null
  source: 'csv' | 'pdf'
}

export interface NewMerchantMapping {
  merchantName: string
  categoryId: string
}

export interface ImportStats {
  newCount: number
  duplicates: number
  fromMap: number
  fromClaude: number
  uncategorised: number
}

export type AnalyseSuccess = {
  ok: true
  transactions: AnalysedTransaction[]
  newMerchantMappings: NewMerchantMapping[]
  stats: ImportStats
  format: string
  fileType: 'csv' | 'pdf'
  accountId: string
  filename: string
}

export type AnalyseResult = AnalyseSuccess | { ok: false; error: string }

export type CommitResult = { error: null; stats: ImportStats } | { error: string }
