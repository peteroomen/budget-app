export const MAX_IMPORT_ROWS = 3000
export const MAX_FILE_BYTES = 4 * 1024 * 1024
export const MAX_CENTS = 2147483647

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function isCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= MAX_CENTS
}

export function parseMoney(value: string): number | null {
  const raw = value.trim()
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(raw)) return null
  const cents = Math.round(Number(raw.replace(/,/g, '')) * 100)
  return isCents(cents) ? cents : null
}

export function validDescription(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 2000
}
