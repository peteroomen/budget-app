interface PageResult<T> {
  data: T[] | null
  error: { message: string } | null
}

/** Callers must order by a unique, stable key. Never treat a failed page as EOF. */
export async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = []
  const size = 500
  for (let from = 0; ; from += size) {
    const result = await page(from, from + size - 1)
    if (result.error) throw new Error('Could not load data. Please retry.')
    if (!result.data) throw new Error('No response received. Please retry.')
    rows.push(...result.data)
    if (result.data.length < size) return rows
  }
}
