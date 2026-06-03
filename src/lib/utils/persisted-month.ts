// Module-level store: survives client-side navigations, resets on hard reload.
// Updated by nav components whenever a valid month appears in the URL.
let _month: string | null = null

export function rememberMonth(month: string | null) {
  if (month && /^\d{4}-\d{2}$/.test(month)) _month = month
}

export function getRememberedMonth(): string | null {
  return _month
}
