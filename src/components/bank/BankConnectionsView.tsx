import type { Account } from '@/types'
import type { BankLink } from '@/lib/bank/status'
import { BankLinkCard } from './BankLinkCard'
import { LinkBankForm } from './LinkBankForm'

export function BankConnectionsView({
  accounts,
  links,
  canManage,
  scheduled,
  error,
  today,
}: {
  accounts: Account[]
  links: BankLink[]
  canManage: boolean
  scheduled: boolean
  error: boolean
  today: string
}) {
  return (
    <section aria-labelledby="bank-heading" className="space-y-4 rounded-xl border p-4 sm:p-6">
      <div>
        <h2 id="bank-heading" className="font-display text-xl">
          ANZ automatic imports
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect through Akahu. Settled transactions only; pending purchases arrive after they
          clear.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Connection status could not be loaded. Please retry; setup may still need a database
          update.
        </p>
      ) : (
        <>
          {!scheduled && (
            <p className="text-sm text-muted-foreground">
              Daily imports are disabled. Once setup is configured, you can link accounts and run a
              manual sync before enabling the daily schedule.
            </p>
          )}
          {links.map((link) => (
            <BankLinkCard
              key={link.id}
              link={link}
              accountName={accounts.find((a) => a.id === link.account_id)?.name ?? 'Tide account'}
              canManage={canManage}
            />
          ))}
          {canManage ? (
            <LinkBankForm
              accounts={accounts.filter(
                (a) => a.currency === 'NZD' && !links.some((l) => l.account_id === a.id)
              )}
              linkedExternalIds={links.map((l) => l.provider_account_id)}
              today={today}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {links.length
                ? 'Only the configured account owner can manage these connections.'
                : 'Setup is not available for this session. The production account owner can connect after server configuration is complete.'}
            </p>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Akahu refreshes daily. Sync reads its latest available data; it does not refresh your bank.
        CSV and PDF imports remain available.
      </p>
      <a
        href="https://my.akahu.nz"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm underline underline-offset-4"
      >
        Open Akahu to connect or reconnect ANZ ↗
      </a>
    </section>
  )
}
