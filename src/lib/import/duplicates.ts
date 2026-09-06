type Row = { date: string; amount_cents: number; description: string }
const key = (row: Row) => JSON.stringify([row.date, row.amount_cents, row.description])

/** Multiset difference: repeated purchases within one statement remain distinct. */
export function selectNewOccurrences<T extends Row>(incoming: T[], existing: Row[]): T[] {
  const counts = new Map<string, number>()
  for (const row of existing) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1)
  return incoming.filter((row) => {
    const k = key(row)
    const remaining = counts.get(k) ?? 0
    if (remaining === 0) return true
    counts.set(k, remaining - 1)
    return false
  })
}
