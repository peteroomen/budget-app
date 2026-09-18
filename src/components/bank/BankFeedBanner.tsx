import Link from 'next/link'
import { getBankSettings } from '@/lib/queries/bank'
import { bankWarnings } from '@/lib/bank/status'

export async function BankFeedBanner() {
  const { links, error, scheduled } = await getBankSettings()
  const warnings = bankWarnings(links)
  if (error) warnings.unshift('Bank connection status is unavailable. Totals may be incomplete.')
  if (links.length && !scheduled)
    warnings.unshift('Daily bank imports are disabled. Only manual syncs update bank data.')
  if (!warnings.length) return null
  return (
    <aside
      aria-label="Bank data status"
      className="mb-6 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm"
    >
      <p className="font-medium">Bank data needs attention</p>
      <ul className="mt-2 space-y-1 break-words">
        {warnings.map((message, i) => (
          <li key={i}>{message}</li>
        ))}
      </ul>
      <p className="mt-2">Missing transactions can make spending look lower than it is.</p>
      <Link
        className="mt-2 inline-block underline underline-offset-4"
        href="/settings?tab=accounts"
      >
        Manage bank connections
      </Link>
    </aside>
  )
}
