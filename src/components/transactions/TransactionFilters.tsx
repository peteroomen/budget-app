'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarIcon, SearchIcon, XIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import type { Account, Category } from '@/types'

const ALL = '__all__'

interface Props {
  accounts: Account[]
  categories: Category[]
}

export function TransactionFilters({ accounts, categories }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const push = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      // Always clear sort params so we don't accumulate stale ones
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
  const categoryId = searchParams.get('cat') ?? ''
  const dateFrom = searchParams.get('from') ?? ''
  const dateTo = searchParams.get('to') ?? ''
  const search = searchParams.get('q') ?? ''

  const dateFromParsed = dateFrom ? parseISO(dateFrom) : undefined
  const dateToParsed = dateTo ? parseISO(dateTo) : undefined

  // Debounce search input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearch = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => push({ q: value }), 350)
  }
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    []
  )

  const hasFilters = !!(accountId || categoryId || dateFrom || dateTo || search)

  const clearAll = () => {
    router.push('/transactions')
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-label text-muted-foreground">Search</Label>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 w-56"
            placeholder="Merchant name…"
            defaultValue={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Account */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-label text-muted-foreground">Account</Label>
        <Select
          value={accountId || ALL}
          onValueChange={(v) => push({ account: v === ALL ? '' : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
                {a.institution ? ` — ${a.institution}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-label text-muted-foreground">Category</Label>
        <Select value={categoryId || ALL} onValueChange={(v) => push({ cat: v === ALL ? '' : v })}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* From date */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-label text-muted-foreground">From</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-36 justify-start text-left font-normal',
                !dateFrom && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
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

      {/* To date */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-label text-muted-foreground">To</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-36 justify-start text-left font-normal',
                !dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
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

      {/* Clear */}
      {hasFilters && (
        <Button variant="ghost" size="sm" className="gap-1.5 self-end" onClick={clearAll}>
          <XIcon className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
