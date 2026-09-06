export interface MonthlySummaryJSON {
  headline: string
  spendNote: string
  overBudgetCategories: Array<{ category: string; note: string }>
  biggestMerchantNote: string | null
  vsLastMonthNote: string | null
  notablePatterns: string[]
}

export function parseSummary(raw: string): MonthlySummaryJSON {
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object') throw new Error('Invalid recap')
  const s = value as Record<string, unknown>
  const text = (v: unknown): v is string => typeof v === 'string' && v.length <= 10000
  const nullableText = (v: unknown) => v === null || text(v)
  if (
    !text(s.headline) ||
    !text(s.spendNote) ||
    !nullableText(s.biggestMerchantNote) ||
    !nullableText(s.vsLastMonthNote) ||
    !Array.isArray(s.notablePatterns) ||
    !s.notablePatterns.every(text) ||
    !Array.isArray(s.overBudgetCategories) ||
    !s.overBudgetCategories.every(
      (v) => v && typeof v === 'object' && text(v.category) && text(v.note)
    )
  )
    throw new Error('Invalid recap')
  return s as unknown as MonthlySummaryJSON
}
