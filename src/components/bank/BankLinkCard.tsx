'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { bankStatus, type BankLink } from '@/lib/bank/status'
import { setBankLinkEnabled, syncBankAccount } from '@/lib/actions/bank'

function time(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat('en-NZ', {
        timeZone: 'Pacific/Auckland',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Not yet'
}
export function BankLinkCard({
  link,
  accountName,
  canManage,
}: {
  link: BankLink
  accountName: string
  canManage: boolean
}) {
  const [pending, start] = useTransition()
  const [message, setMessage] = useState('')
  const router = useRouter()
  function act(sync: boolean) {
    setMessage('')
    start(async () => {
      try {
        if (sync) {
          const result = await syncBankAccount(link.id)
          setMessage(
            result.error ??
              (result.continuing
                ? 'Import will continue on the next sync. You can sync again to continue now.'
                : 'Sync completed. Check the bank refresh time below.')
          )
        } else {
          const enabled = !link.enabled
          const result = await setBankLinkEnabled(link.id, enabled)
          setMessage(result.error ?? (enabled ? 'Connection resumed.' : 'Connection paused.'))
        }
        router.refresh()
      } catch {
        setMessage('Unable to complete this request. Please retry.')
      }
    })
  }
  return (
    <article className="min-w-0 space-y-3 rounded-lg border p-4">
      <div className="break-words">
        <h3 className="font-medium">{link.name}</h3>
        <p className="text-sm text-muted-foreground">Imports into {accountName}</p>
      </div>
      <p className="text-sm font-medium">{bankStatus(link)}</p>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Recent bank data refreshed (NZ)</dt>
          <dd>{time(link.recent_refreshed_at)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last successful import (NZ)</dt>
          <dd>{time(link.last_success_at)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Recent import through</dt>
          <dd>{link.last_recent_date ?? 'Not yet'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">History from {link.cutover_date}</dt>
          <dd>
            {link.initial_history_complete
              ? 'Initial history imported; older dates checked in rotation.'
              : `Next history window starts ${link.history_cursor}.`}
          </dd>
        </div>
      </dl>
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={pending || !link.enabled} onClick={() => act(true)}>
            {pending ? 'Working…' : 'Sync now'}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => act(false)}>
            {link.enabled ? 'Pause' : 'Resume'}
          </Button>
        </div>
      )}
      <p role="status" aria-live="polite" className="text-sm">
        {message}
      </p>
    </article>
  )
}
