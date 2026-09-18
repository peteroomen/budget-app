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
  if (!link.last_success_at) return 'Waiting for first import'
  if (!link.refreshed_at || now - Date.parse(link.refreshed_at) > 36 * 3600000)
    return 'Bank data is more than 36 hours old'
  return 'Connected · settled transactions only'
}
