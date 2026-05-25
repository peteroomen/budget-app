'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { TransactionRow } from '@/lib/queries/transactions'
import type { Category } from '@/types'

interface Props {
  rows: TransactionRow[]
  categories: Category[]
  className?: string
}

interface DayGroup {
  dateStr: string // YYYY-MM-DD
  label: string // "Today" | "Yesterday" | "Wed, 21 May"
  daySpend: number // absolute cents (expenses only)
  transactions: TransactionRow[]
}

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 2,
})

const nzdCompact = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatDayLabel(dateStr: string): string {
  // dateStr is "YYYY-MM-DD" — parse parts explicitly to avoid UTC offset issues
  const parts = dateStr.split('-')
  const year = parseInt(parts[0] ?? '0', 10)
  const month = parseInt(parts[1] ?? '1', 10)
  const day = parseInt(parts[2] ?? '1', 10)
  const txDate = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (txDate.getTime() === today.getTime()) return 'Today'
  if (txDate.getTime() === yesterday.getTime()) return 'Yesterday'

  return txDate.toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function groupByDay(rows: TransactionRow[]): DayGroup[] {
  const map = new Map<string, TransactionRow[]>()

  // rows arrive sorted desc by date already
  for (const row of rows) {
    const d = row.date.slice(0, 10) // ensure YYYY-MM-DD
    if (!map.has(d)) map.set(d, [])
    map.get(d)!.push(row)
  }

  return Array.from(map.entries()).map(([dateStr, txns]) => ({
    dateStr,
    label: formatDayLabel(dateStr),
    daySpend: txns
      .filter((t) => t.amount_cents < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0),
    transactions: txns,
  }))
}

export function TransactionDayList({ rows, categories, className }: Props) {
  const groups = useMemo(() => groupByDay(rows), [rows])

  if (rows.length === 0) {
    return (
      <p className={cn('py-8 text-center text-sm text-muted-foreground', className)}>
        No transactions found.
      </p>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {groups.map((group) => (
        <div key={group.dateStr}>
          {/* Day header */}
          <div className="flex items-center justify-between border-b pb-1">
            <span className="text-[13px] font-semibold">{group.label}</span>
            {group.daySpend > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {nzdCompact.format(group.daySpend / 100)}
              </span>
            )}
          </div>

          {/* Transaction rows */}
          <div className="divide-y">
            {group.transactions.map((txn) => {
              const cat = categories.find((c) => c.id === txn.category_id)
              const isIncome = txn.amount_cents > 0

              return (
                <div
                  key={txn.id}
                  className="grid items-center gap-x-2 py-2"
                  style={{ gridTemplateColumns: '9px 1fr auto' }}
                >
                  {/* Category dot */}
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cat?.color ?? '#9ca3af' }}
                  />

                  {/* Merchant + category */}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium leading-snug">
                      {txn.merchant_name ?? txn.description}
                    </p>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {cat?.name ?? 'Uncategorised'}
                    </p>
                  </div>

                  {/* Amount */}
                  <span
                    className={cn(
                      'text-[13px] font-medium tabular-nums',
                      isIncome ? 'text-green-600' : ''
                    )}
                  >
                    {isIncome ? '+' : ''}
                    {nzd.format(txn.amount_cents / 100)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
