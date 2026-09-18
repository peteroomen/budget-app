import { isCents, isValidDate, validDescription } from '../import/validation'
import { nzDate } from '../utils/month'
import { normaliseMerchant } from '../parsers/normalise'

export type BankErrorCode =
  | 'reconnect'
  | 'unavailable'
  | 'invalid_data'
  | 'stale'
  | 'changed'
  | 'overlap'
export class BankError extends Error {
  constructor(public code: BankErrorCode) {
    super(code)
  }
}
export interface BankAccount {
  id: string
  name: string
  suffix: string
  type: 'CHECKING' | 'SAVINGS'
  active: boolean
  refreshedAt: string | null
}
export interface BankRow {
  id: string
  accountId: string
  date: string
  timestamp: string
  updatedAt: string
  amountCents: number
  description: string
  merchant: string
}
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new BankError('invalid_data')
  return v as Record<string, unknown>
}
function timestamp(v: unknown): string {
  if (
    typeof v !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(v) ||
    !isValidDate(v.slice(0, 10)) ||
    !Number.isFinite(Date.parse(v))
  )
    throw new BankError('invalid_data')
  return new Date(v).toISOString()
}
export function bankId(v: unknown, prefix: 'acc' | 'trans' | 'user'): string {
  if (typeof v !== 'string' || !new RegExp(`^${prefix}_[a-zA-Z0-9]{1,90}$`).test(v))
    throw new BankError('invalid_data')
  return v
}
export function parseAccount(value: unknown): BankAccount | null {
  const a = object(value)
  const connection = object(a.connection)
  if (connection.name !== 'ANZ' || !['CHECKING', 'SAVINGS'].includes(String(a.type))) return null
  if (
    object(a.balance).currency !== 'NZD' ||
    !Array.isArray(a.attributes) ||
    !a.attributes.includes('TRANSACTIONS')
  )
    return null
  if (a.status !== 'ACTIVE' && a.status !== 'INACTIVE') throw new BankError('invalid_data')
  if (typeof a.name !== 'string') throw new BankError('invalid_data')
  const refreshed = a.refreshed ? object(a.refreshed).transactions : null
  return {
    id: bankId(a._id, 'acc'),
    name: a.name.slice(0, 160),
    suffix: typeof a.formatted_account === 'string' ? a.formatted_account.slice(-4) : '',
    type: a.type as BankAccount['type'],
    active: a.status === 'ACTIVE',
    refreshedAt: refreshed ? timestamp(refreshed) : null,
  }
}
export function parseBankRow(value: unknown, accountId: string): BankRow {
  const t = object(value)
  if (
    t._account !== accountId ||
    typeof t.amount !== 'number' ||
    !Number.isFinite(t.amount) ||
    !validDescription(t.description)
  )
    throw new BankError('invalid_data')
  const amount = Math.round(t.amount * 100)
  if (!isCents(amount) || Math.abs(t.amount * 100 - amount) > 0.00001)
    throw new BankError('invalid_data')
  const instant = timestamp(t.date)
  return {
    id: bankId(t._id, 'trans'),
    accountId,
    timestamp: instant,
    date: nzDate(new Date(instant)),
    updatedAt: timestamp(t.updated_at),
    amountCents: amount,
    description: t.description as string,
    merchant: normaliseMerchant(t.description as string),
  }
}
/** NZ calendar boundaries across DST; provider start is exclusive, end inclusive. */
export function nzMidnight(day: string): number {
  if (!isValidDate(day)) throw new BankError('invalid_data')
  const utc = Date.parse(`${day}T00:00:00Z`)
  for (const offset of [12, 13]) {
    const candidate = utc - offset * 3600000
    const h = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Pacific/Auckland',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(candidate)
    if (nzDate(new Date(candidate)) === day && h === '00') return candidate
  }
  throw new BankError('invalid_data')
}
export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
}
export function queryBounds(from: string, to: string) {
  return {
    start: new Date(nzMidnight(from) - 1).toISOString(),
    end: new Date(nzMidnight(addDays(to, 1)) - 1).toISOString(),
  }
}
export class Akahu {
  constructor(
    private appToken: string,
    private userToken: string,
    private fetcher: typeof fetch = fetch
  ) {}
  private async request(path: string, query?: URLSearchParams): Promise<Record<string, unknown>> {
    let response: Response
    try {
      response = await this.fetcher(`https://api.akahu.io/v1/${path}${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${this.userToken}`, 'X-Akahu-Id': this.appToken },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
      })
    } catch {
      throw new BankError('unavailable')
    }
    if ([401, 403, 404].includes(response.status)) throw new BankError('reconnect')
    if (!response.ok) throw new BankError('unavailable')
    let data: Record<string, unknown>
    try {
      data = object(await response.json())
    } catch {
      throw new BankError('invalid_data')
    }
    if (data.success !== true) throw new BankError('invalid_data')
    return data
  }
  async identity() {
    const me = object((await this.request('me')).item)
    return {
      id: bankId(me._id, 'user'),
      earliestDate: addDays(nzDate(new Date(timestamp(me.access_granted_at))), -730),
    }
  }
  async accounts(): Promise<BankAccount[]> {
    const response = await this.request('accounts')
    if (!Array.isArray(response.items)) throw new BankError('invalid_data')
    return response.items.map(parseAccount).filter((a): a is BankAccount => a !== null)
  }
  async account(id: string): Promise<BankAccount> {
    bankId(id, 'acc')
    const account = parseAccount((await this.request(`accounts/${id}`)).item)
    if (!account || account.id !== id || !account.active) throw new BankError('reconnect')
    if (!account.refreshedAt || Date.now() - Date.parse(account.refreshedAt) > 72 * 3600000)
      throw new BankError('stale')
    return account
  }
  async page(id: string, from: string, to: string, cursor: string | null) {
    bankId(id, 'acc')
    const params = new URLSearchParams(queryBounds(from, to))
    if (cursor !== null) params.set('cursor', cursor)
    const response = await this.request(`accounts/${id}/transactions`, params)
    const next = object(response.cursor).next
    if (
      !Array.isArray(response.items) ||
      (next !== null && (typeof next !== 'string' || !next || next.length > 4000))
    )
      throw new BankError('invalid_data')
    const rows = response.items.map((t) => parseBankRow(t, id))
    if (rows.some((t) => t.date < from || t.date > to)) throw new BankError('invalid_data')
    return { rows, next: next as string | null }
  }
}
