// Trailing card/terminal suffixes banks append to merchant names, e.g.:
// "COUNTDOWN TAKANINI 1234 5678" → "COUNTDOWN TAKANINI"
// "PAKNSAVE PAPAKURA 12345" → "PAKNSAVE PAPAKURA"
const TRAILING_JUNK = /\s+\d[\d\s]{3,}$/

export function normaliseMerchant(raw: string): string {
  return raw.toUpperCase().replace(TRAILING_JUNK, '').trim()
}
