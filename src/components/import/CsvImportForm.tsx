'use client'

import { useActionState, useRef } from 'react'
import { importCsv, type ImportResult } from '@/lib/actions/import'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { Account } from '@/types'

const initial: ImportResult = { error: null }

export function CsvImportForm({ accounts }: { accounts: Account[] }) {
  const [state, action, pending] = useActionState(importCsv, initial)
  const formRef = useRef<HTMLFormElement>(null)

  const succeeded = !state.error && state.inserted !== undefined

  return (
    <form ref={formRef} action={action} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="account_id">Account</Label>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accounts yet.{' '}
            <a href="/accounts" className="underline">
              Add one first.
            </a>
          </p>
        ) : (
          <select
            id="account_id"
            name="account_id"
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.institution ? ` — ${a.institution}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">CSV file</Label>
        <Input id="file" name="file" type="file" accept=".csv" required />
        <p className="text-xs text-muted-foreground">Supported banks: ANZ, ASB, Westpac, BNZ</p>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      {succeeded && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">Import complete ({state.format})</p>
          <p>
            {state.inserted} transaction{state.inserted !== 1 ? 's' : ''} added
          </p>
          {state.duplicates! > 0 && (
            <p className="text-green-700">
              {state.duplicates} duplicate{state.duplicates !== 1 ? 's' : ''} skipped
            </p>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending || accounts.length === 0}>
        {pending ? 'Importing…' : 'Import'}
      </Button>
    </form>
  )
}
