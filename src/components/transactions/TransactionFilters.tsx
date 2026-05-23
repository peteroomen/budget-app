'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
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

  const dateFromParsed = dateFrom ? parseISO(dateFrom) : undefined
  const dateToParsed = dateTo ? parseISO(dateTo) : undefined

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col gap-1.5 min-w-44">
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

      <div className="flex flex-col gap-1.5">
        <Label>From</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-40 justify-start text-left font-normal',
                !dateFrom && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFromParsed ? format(dateFromParsed, 'd MMM yyyy') : 'Start date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFromParsed}
              onSelect={(d) => push({ from: d ? format(d, 'yyyy-MM-dd') : '' })}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>To</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-40 justify-start text-left font-normal',
                !dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateToParsed ? format(dateToParsed, 'd MMM yyyy') : 'End date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateToParsed}
              onSelect={(d) => push({ to: d ? format(d, 'yyyy-MM-dd') : '' })}
            />
          </PopoverContent>
        </Popover>
      </div>

      {(accountId || dateFrom || dateTo) && (
        <Button variant="ghost" onClick={() => router.push('/transactions')}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
