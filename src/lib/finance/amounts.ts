/** Signed NZD cents. Expense credits are refunds; income debits reverse income. */
export function expenseCents(amount: number, type: string | null | undefined): number {
  if (type === 'transfer' || type === 'income') return 0
  return type === 'expense' ? -amount : Math.max(0, -amount)
}

/** Includes unclassified credits provisionally; callers must label that component. */
export function incomeCents(amount: number, type: string | null | undefined): number {
  if (type === 'transfer' || type === 'expense') return 0
  return type === 'income' ? amount : Math.max(0, amount)
}

export function budgetState(actual: number, cap: number | null) {
  const over = cap !== null && actual > cap
  const at = cap !== null && actual === cap
  const ratio = cap !== null && cap > 0 ? Math.max(0, actual / cap) : 0
  return {
    over,
    at,
    approaching: cap !== null && cap > 0 && ratio >= 0.8,
    progress: cap === 0 && actual > 0 ? 100 : Math.min(100, ratio * 100),
    percent: cap === null || cap === 0 ? null : Math.round(ratio * 100),
  }
}
