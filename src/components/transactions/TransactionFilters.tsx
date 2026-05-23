'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Account } from '@/types'

const ALL_ACCOUNTS = '__all__'

interface Props {
  accounts: Account[]
}

export function TransactionFilters({ accounts }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const push = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      router.push(`/transactions?${params.toString()}`)
    },
    [router, searchParams]
  )

  const accountId = searchParams.get('account') ?? ''
  const dateFrom = searchParams.get('from') ?? ''
  const dateTo = searchParams.get('to') ?? ''

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="space-y-1.5 min-w-44">
        <Label>Account</Label>
        <Select
          value={accountId || ALL_ACCOUNTS}
          onValueChange={(v) => push({ account: v === ALL_ACCOUNTS ? '' : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ACCOUNTS}>All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
                {a.institution ? ` — ${a.institution}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date-from">From</Label>
        <Input
          id="date-from"
          type="date"
          value={dateFrom}
          className="w-40"
          onChange={(e) => push({ from: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date-to">To</Label>
        <Input
          id="date-to"
          type="date"
          value={dateTo}
          className="w-40"
          onChange={(e) => push({ to: e.target.value })}
        />
      </div>

      {(accountId || dateFrom || dateTo) && (
        <Button variant="ghost" onClick={() => router.push('/transactions')}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
