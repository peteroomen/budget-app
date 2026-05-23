'use client'

import { useActionState, useState } from 'react'
import { importPdf, type ImportPdfResult } from '@/lib/actions/import-pdf'
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

const initial: ImportPdfResult = { error: null }

export function PdfImportForm({ accounts }: { accounts: Account[] }) {
  const [state, action, pending] = useActionState(importPdf, initial)
  const [accountId, setAccountId] = useState('')

  const succeeded = !state.error && state.inserted !== undefined

  return (
    <form action={action} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="pdf-account_id">Account</Label>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accounts yet.{' '}
            <a href="/accounts" className="underline">
              Add one first.
            </a>
          </p>
        ) : (
          <>
            <input type="hidden" name="account_id" value={accountId} />
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="pdf-account_id">
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
        <Label htmlFor="pdf-file">PDF statement</Label>
        <Input id="pdf-file" name="file" type="file" accept=".pdf" required />
        <p className="text-xs text-muted-foreground">
          ANZ PDF bank statements. Must be text-based, not scanned.
        </p>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      {succeeded && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">Import complete</p>
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

      <Button type="submit" disabled={pending || !accountId}>
        {pending ? 'Importing…' : 'Import'}
      </Button>
    </form>
  )
}
