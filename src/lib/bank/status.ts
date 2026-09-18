export interface BankLink {
  id: string
  account_id: string
  household_id: string
  owner_id: string
  provider_user_id: string
  provider_account_id: string
  name: string
  enabled: boolean
  cutover_date: string
  history_cursor: string
  last_success_at: string | null
  refreshed_at: string | null
  last_recent_date: string | null
  error_code: string | null
  recent_refreshed_at?: string | null
  initial_history_complete?: boolean
  sync_pending?: boolean
}
export function bankStatus(link: BankLink, now = Date.now()): string {
  if (!link.enabled) return 'Paused'
  const errors: Record<string, string> = {
    reconnect: 'Reconnect this account in Akahu, then retry.',
    stale: 'Bank data is stale or not ready. Waiting for Akahu to refresh.',
    overlap: 'Statement overlap needs attention. Resolve duplicate statement rows before retrying.',
    changed: 'Bank data refreshed during import. Retrying safely.',
    invalid_data: 'Bank data could not be validated. Existing transactions were kept.',
    unavailable: 'Sync interrupted. Existing transactions were kept; retry to continue.',
  }
  if (link.error_code) return errors[link.error_code] ?? errors.unavailable!
  if (!link.last_recent_date) return 'Waiting for first import'
  if (link.sync_pending) return 'Import in progress; some transactions are not available yet.'
  if (!link.recent_refreshed_at || now - Date.parse(link.recent_refreshed_at) > 36 * 3600000)
    return 'Bank data is more than 36 hours old'
  if (link.last_recent_date < new Date(now - 36 * 3600000).toISOString().slice(0, 10))
    return 'Recent imports are behind. Retry sync.'
  if (!link.initial_history_complete) return 'Importing history; older totals may be incomplete.'
  return 'Connected · settled transactions only'
}

export function bankWarnings(links: BankLink[] = [], now = Date.now()): string[] {
  return links.flatMap((link) => {
    const status = bankStatus(link, now)
    return status.startsWith('Connected') ? [] : [`${link.name}: ${status}`]
  })
}
export function bankContext(links: BankLink[] = []): string {
  if (!links.length) return ''
  const warnings = bankWarnings(links)
  return [
    'Bank feeds contain settled transactions only; pending purchases are excluded.',
    ...links.map(
      (l) =>
        `${l.name}: recent bank data refreshed ${l.recent_refreshed_at ?? 'never'}; recent import through ${l.last_recent_date ?? 'not imported'}; history from ${l.cutover_date}.`
    ),
    ...warnings,
    ...(warnings.length
      ? [
          'Data is incomplete or stale. Do not interpret low spending or missing income as financial performance; qualify conclusions and projections.',
        ]
      : []),
  ].join('\n')
}
