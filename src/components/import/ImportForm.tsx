'use client'

import { useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckIcon } from 'lucide-react'
import { importStatement, type ImportResult } from '@/lib/actions/import'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DropZone } from '@/components/import/DropZone'
import type { Account } from '@/types'

const initial: ImportResult = { error: null }

const SUPPORTED_BANKS = [
  { name: 'ANZ', formats: 'CSV · PDF' },
  { name: 'ASB', formats: 'CSV' },
  { name: 'Westpac', formats: 'CSV' },
  { name: 'BNZ', formats: 'CSV' },
]

export function ImportForm({ accounts }: { accounts: Account[] }) {
  const [state, action, pending] = useActionState(importStatement, initial)
  const [accountId, setAccountId] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const succeeded = !state.error && state.inserted !== undefined

  const handleFile = (file: File) => {
    setFileName(file.name)
  }

  const handleReset = () => {
    setFileName(null)
    setAccountId('')
    formRef.current?.reset()
    window.location.reload()
  }

  if (succeeded) {
    return (
      <div className="max-w-md">
        <div className="flex flex-col items-center rounded-xl border border-border bg-card px-8 py-10 text-center">
          {/* Success icon */}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckIcon className="h-6 w-6" />
          </div>

          <p className="font-display text-display-hero-sm font-medium">Imported successfully</p>
          <p className="mt-2 max-w-xs text-body-sm text-muted-foreground">
            {state.format && <span className="font-medium text-foreground">{state.format} · </span>}
            {state.inserted} transaction{state.inserted !== 1 ? 's' : ''} added
            {(state.duplicates ?? 0) > 0
              ? `, ${state.duplicates} duplicate${state.duplicates !== 1 ? 's' : ''} skipped`
              : ''}
          </p>

          {/* Stat grid */}
          <div className="mt-6 grid w-full max-w-xs grid-cols-2 gap-2">
            {[
              { label: 'Imported', value: state.inserted ?? 0 },
              { label: 'Duplicates skipped', value: state.duplicates ?? 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-2.5 text-center">
                <p className="font-display text-display-metric font-medium tabular-nums">
                  {s.value}
                </p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-2">
            <Button asChild>
              <Link href="/transactions">Review transactions</Link>
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              Import another
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <form ref={formRef} action={action} className="space-y-5">
        {/* Account selector */}
        <div className="space-y-2">
          <Label htmlFor="account_id">Account</Label>
          {accounts.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              No accounts yet.{' '}
              <a
                href="/settings?tab=accounts"
                className="underline transition-colors hover:text-foreground"
              >
                Add one first.
              </a>
            </p>
          ) : (
            <>
              <input type="hidden" name="account_id" value={accountId} />
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="account_id">
                  <SelectValue placeholder="Select account…" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      {a.institution ? ` — ${a.institution}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Drop zone — renders the hidden file input internally */}
        <DropZone onFile={handleFile} disabled={pending} />

        {/* Selected file name */}
        {fileName && (
          <p className="text-body-sm text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{fileName}</span>
          </p>
        )}

        {state.error && <p className="text-body-sm text-destructive">{state.error}</p>}

        <Button type="submit" disabled={pending || !accountId || !fileName}>
          {pending ? 'Importing…' : 'Import'}
        </Button>
      </form>

      {/* What we support */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-sans text-display-card-title font-medium uppercase tracking-[0.05em] text-muted-foreground">
            What we support
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SUPPORTED_BANKS.map((b) => (
              <div key={b.name} className="rounded-lg border border-border p-3">
                <p className="text-display-card-title font-semibold">{b.name}</p>
                <p className="mt-0.5 text-label text-muted-foreground">{b.formats}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
