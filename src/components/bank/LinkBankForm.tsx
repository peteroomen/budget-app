'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Account } from '@/types'
import type { BankAccount } from '@/lib/bank/akahu'
import { discoverBankAccounts, linkBankAccount, suggestedCutover } from '@/lib/actions/bank'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BankAccountSelectors } from './BankAccountSelectors'

export function LinkBankForm({
  accounts,
  linkedExternalIds,
  today,
}: {
  accounts: Account[]
  linkedExternalIds: string[]
  today: string
}) {
  const [external, setExternal] = useState<BankAccount[] | null>(null)
  const [earliest, setEarliest] = useState('')
  const [accountId, setAccountId] = useState('')
  const [externalId, setExternalId] = useState('')
  const [cutover, setCutover] = useState(today)
  const [message, setMessage] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()
  function discover() {
    setMessage('')
    start(async () => {
      try {
        const result = await discoverBankAccounts()
        if (!result.ok) {
          setMessage(result.error)
          return
        }
        setExternal(result.accounts.filter((a) => !linkedExternalIds.includes(a.id)))
        setEarliest(result.earliestDate)
      } catch {
        setMessage('Unable to load accounts. Please retry.')
      }
    })
  }
  function chooseAccount(id: string) {
    setAccountId(id)
    start(async () => {
      try {
        const result = await suggestedCutover(id)
        setCutover(result.date < earliest ? earliest : result.date)
      } catch {
        setMessage('Could not suggest a date. Choose the first day you want to import.')
      }
    })
  }
  function link(event: React.FormEvent) {
    event.preventDefault()
    setMessage('')
    start(async () => {
      try {
        const result = await linkBankAccount(accountId, externalId, cutover)
        if (result.error) {
          setMessage(result.error)
          return
        }
        setMessage('Account linked.')
        setExternal(null)
        setExternalId('')
        setAccountId('')
        router.refresh()
      } catch {
        setMessage('Unable to link this account. Please retry.')
      }
    })
  }
  const selected = external?.find((a) => a.id === externalId)
  return (
    <div className="space-y-3 border-t pt-4">
      {!accounts.length ? (
        <p className="text-sm text-muted-foreground">
          Add an unlinked NZD account above to connect another ANZ account.
        </p>
      ) : (
        <>
          <Button variant="outline" disabled={pending} onClick={discover}>
            {pending ? 'Working…' : 'Find my ANZ accounts'}
          </Button>
          {external && !external.length && (
            <p className="text-sm">
              No unlinked ANZ NZD spending or savings accounts found. Check your Akahu connections.
            </p>
          )}
          {!!external?.length && (
            <form onSubmit={link} className="space-y-4">
              <BankAccountSelectors
                external={external}
                accounts={accounts}
                externalId={externalId}
                accountId={accountId}
                pending={pending}
                onExternal={setExternalId}
                onAccount={chooseAccount}
              />
              <div className="space-y-2">
                <Label htmlFor="bank-cutover">First date to import</Label>
                <Input
                  id="bank-cutover"
                  type="date"
                  required
                  min={earliest}
                  max={today}
                  value={cutover}
                  disabled={pending}
                  onChange={(e) => setCutover(e.target.value)}
                  aria-describedby="bank-cutover-help"
                  className="w-full min-w-0"
                />
                <p id="bank-cutover-help" className="text-xs text-muted-foreground">
                  Choose the day after your last complete statement, or an earlier day for backfill.
                  Older history imports gradually. Ambiguous statement overlap stops the import for
                  review.
                </p>
              </div>
              {selected && accountId && (
                <p className="rounded-md bg-muted p-3 text-sm break-words">
                  Link {selected.name} to {accounts.find((a) => a.id === accountId)?.name}, starting{' '}
                  {cutover}. Transactions will be shared with this Tide household. This mapping is
                  fixed after linking.
                </p>
              )}
              <Button
                type="submit"
                disabled={pending || !accountId || !selected?.active || !cutover}
              >
                {pending ? 'Working…' : 'Link account'}
              </Button>
            </form>
          )}
        </>
      )}
      <p role="status" aria-live="polite" className="text-sm">
        {message}
      </p>
    </div>
  )
}
