'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckIcon } from 'lucide-react'
import { analyseImport, commitImport } from '@/lib/actions/import'
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
import { ImportPreview } from '@/components/import/ImportPreview'
import type { Account } from '@/types'
import type { AnalyseSuccess, ImportStats } from '@/lib/types/import'

type Step =
  | { name: 'idle' }
  | { name: 'preview'; data: AnalyseSuccess }
  | { name: 'success'; stats: ImportStats; format: string }

const SUPPORTED_BANKS = [
  { name: 'ANZ', formats: 'CSV · PDF' },
  { name: 'ASB', formats: 'CSV' },
  { name: 'Westpac', formats: 'CSV' },
  { name: 'BNZ', formats: 'CSV' },
]

export function ImportForm({ accounts }: { accounts: Account[] }) {
  const [step, setStep] = useState<Step>({ name: 'idle' })
  const [accountId, setAccountId] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysisPending, startAnalysis] = useTransition()
  const [commitPending, startCommit] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const handleFile = (file: File) => setFileName(file.name)

  const handleReset = () => {
    setStep({ name: 'idle' })
    setFileName(null)
    setAccountId('')
    setError(null)
    formRef.current?.reset()
  }

  const handleAnalyse = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startAnalysis(async () => {
      try {
        const result = await analyseImport(formData)
        if (!result.ok) {
          setError(result.error)
          return
        }
        setStep({ name: 'preview', data: result })
      } catch {
        setError('Unable to analyse this file. Please retry.')
      }
    })
  }

  const handleConfirm = () => {
    if (step.name !== 'preview') return
    const data = step.data
    startCommit(async () => {
      setError(null)
      try {
        const result = await commitImport(data.draftId)
        if (result.error !== null) {
          setError(result.error)
          return
        }
        setStep({ name: 'success', stats: result.stats, format: data.format })
      } catch {
        setError('Confirmation could not be verified. Retry this preview safely.')
      }
    })
  }

  const handleCancelPreview = () => {
    setStep({ name: 'idle' })
    setError(null)
  }

  if (step.name === 'success') {
    const { stats, format } = step
    return (
      <div className="max-w-md">
        <div className="flex flex-col items-center rounded-xl border border-border bg-card px-8 py-10 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckIcon className="h-6 w-6" />
          </div>

          <p className="font-display text-display-hero-sm font-medium">Imported successfully</p>
          <p className="mt-2 max-w-xs text-body-sm text-muted-foreground">
            <span className="font-medium text-foreground">{format} · </span>
            {stats.newCount} transaction{stats.newCount !== 1 ? 's' : ''} added
            {stats.duplicates > 0
              ? `, ${stats.duplicates} duplicate${stats.duplicates !== 1 ? 's' : ''} skipped`
              : ''}
          </p>

          <div className="mt-6 grid w-full max-w-xs grid-cols-2 gap-2">
            {[
              { label: 'Imported', value: stats.newCount },
              { label: 'Duplicates skipped', value: stats.duplicates },
              { label: 'From memory', value: stats.fromMap },
              { label: 'From Claude', value: stats.fromClaude },
              { label: 'Uncategorised', value: stats.uncategorised },
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

  if (step.name === 'preview') {
    return (
      <div className="max-w-lg space-y-4">
        {error && <p className="text-body-sm text-destructive">{error}</p>}
        {step.data.warnings.map((warning) => (
          <p key={warning} role="status" className="text-body-sm text-muted-foreground">
            {warning}
          </p>
        ))}
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-body-sm">
            Review {step.data.transactions.length} new transactions
          </summary>
          <div className="mt-3 max-h-80 overflow-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th className="text-right">NZD</th>
                </tr>
              </thead>
              <tbody>
                {step.data.transactions.map((t, i) => (
                  <tr key={i} className="border-t">
                    <td className="whitespace-nowrap py-2 pr-2">{t.date}</td>
                    <td className="break-words">{t.description}</td>
                    <td className="text-right tabular-nums">{(t.amountCents / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <ImportPreview
          stats={step.data.stats}
          format={step.data.format}
          pending={commitPending}
          onConfirm={handleConfirm}
          onCancel={handleCancelPreview}
        />
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <form ref={formRef} onSubmit={handleAnalyse} className="space-y-5">
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

        <DropZone onFile={handleFile} disabled={analysisPending} />

        {fileName && (
          <p className="text-body-sm text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{fileName}</span>
          </p>
        )}

        {error && <p className="text-body-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={analysisPending || !accountId || !fileName}>
          {analysisPending ? 'Analysing…' : 'Analyse'}
        </Button>
      </form>

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
