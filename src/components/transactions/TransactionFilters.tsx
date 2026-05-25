'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
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
  const search = searchParams.get('q') ?? ''

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

  const hasFilters = !!(accountId || categoryId || search)

  const clearAll = () => {
    // Preserve month param so the user stays on the same month
    const month = searchParams.get('month')
    const params = new URLSearchParams()
    if (month) params.set('month', month)
    router.push(`/transactions?${params.toString()}`)
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
            placeholder="Merchant or description…"
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
