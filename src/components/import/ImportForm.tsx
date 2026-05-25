'use client'

import { useActionState, useState } from 'react'
import { importStatement, type ImportResult } from '@/lib/actions/import'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Account } from '@/types'

const initial: ImportResult = { error: null }

export function ImportForm({ accounts }: { accounts: Account[] }) {
  const [state, action, pending] = useActionState(importStatement, initial)
  const [accountId, setAccountId] = useState('')
  const [hasFile, setHasFile] = useState(false)

  const succeeded = !state.error && state.inserted !== undefined

  return (
    <form action={action} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="account_id">Account</Label>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accounts yet.{' '}
            <a
              href="/settings?tab=accounts"
              className="underline hover:text-foreground transition-colors"
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

      <div className="space-y-2">
        <Label htmlFor="file">Statement file</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".csv,.pdf"
          required
          onChange={(e) => setHasFile((e.target.files?.length ?? 0) > 0)}
        />
        <p className="text-xs text-muted-foreground">
          CSV or PDF. Supported banks: ANZ, ASB, Westpac, BNZ (CSV); ANZ (PDF).
        </p>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      {succeeded && (
        <div className="rounded-lg border border-success/25 bg-success/8 px-4 py-3">
          <p className="text-display-card-title font-medium text-foreground">
            Import complete — {state.format}
          </p>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {state.inserted} transaction{state.inserted !== 1 ? 's' : ''} added
          </p>
          {state.duplicates! > 0 && (
            <p className="text-body-sm text-muted-foreground">
              {state.duplicates} duplicate{state.duplicates !== 1 ? 's' : ''} skipped
            </p>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending || !accountId || !hasFile}>
        {pending ? 'Importing…' : 'Import'}
      </Button>
    </form>
  )
}
