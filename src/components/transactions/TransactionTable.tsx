import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TransactionRow, TransactionSortBy, SortDir } from '@/lib/queries/transactions'
import type { Category } from '@/types'
import { cn } from '@/lib/utils'
import { CategoryCell } from './CategoryCell'
import { RecurringBadge } from './RecurringBadge'
import { ManualBadge } from './ManualBadge'

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 2,
})

function formatAmount(cents: number): string {
  return nzd.format(cents / 100)
}

/**
 * Formats a YYYY-MM-DD date string as a human-friendly relative label:
 * - "Today" / "Yesterday" / "2 days ago" … "7 days ago"
 * - Older same-year dates: "15 May"
 * - Different-year dates: "15 May 2024"
 */
function formatRelativeDate(dateStr: string): string {
  const [yearStr, mStr, dStr] = dateStr.split('-')
  const txDate = new Date(parseInt(yearStr!), parseInt(mStr!) - 1, parseInt(dStr!))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - txDate.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays <= 7) return `${diffDays} days ago`

  return txDate.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    ...(txDate.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  })
}

interface SortHeaderProps {
  label: string
  column: TransactionSortBy
  currentSort: TransactionSortBy
  currentDir: SortDir
  params: URLSearchParams
}

function SortHeader({ label, column, currentSort, currentDir, params }: SortHeaderProps) {
  const isActive = currentSort === column
  const nextDir: SortDir = isActive && currentDir === 'desc' ? 'asc' : 'desc'

  const next = new URLSearchParams(params.toString())
  next.set('sort', column)
  next.set('dir', nextDir)

  const indicator = isActive ? (currentDir === 'desc' ? ' ↓' : ' ↑') : ''
  const ariaLabel = isActive
    ? `${label}, sorted ${currentDir === 'desc' ? 'descending' : 'ascending'}, click to sort ${currentDir === 'desc' ? 'ascending' : 'descending'}`
    : `Sort by ${label}`

  return (
    <Link
      href={`/transactions?${next.toString()}`}
      className="hover:text-foreground transition-colors"
      aria-label={ariaLabel}
    >
      {label}
      {indicator}
    </Link>
  )
}

interface Props {
  rows: TransactionRow[]
  sortBy: TransactionSortBy
  sortDir: SortDir
  params: URLSearchParams
  categories: Category[]
  mappedMerchants: Set<string>
  className?: string
}

export function TransactionTable({
  rows,
  sortBy,
  sortDir,
  params,
  categories,
  mappedMerchants,
  className,
}: Props) {
  if (rows.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground py-8 text-center', className)}>
        No transactions found. Try adjusting your filters or{' '}
        <Link href="/import" className="underline">
          import a statement
        </Link>
        .
      </p>
    )
  }

  return (
    <div className={cn('overflow-x-auto rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-label-caps uppercase text-muted-foreground font-medium w-28">
              <SortHeader
                label="Date"
                column="date"
                currentSort={sortBy}
                currentDir={sortDir}
                params={params}
              />
            </TableHead>
            <TableHead className="text-label-caps uppercase text-muted-foreground font-medium">
              <SortHeader
                label="Merchant"
                column="merchant_name"
                currentSort={sortBy}
                currentDir={sortDir}
                params={params}
              />
            </TableHead>
            <TableHead className="text-label-caps uppercase text-muted-foreground font-medium min-w-[11rem]">
              Category
            </TableHead>
            <TableHead className="text-label-caps uppercase text-muted-foreground font-medium">
              Account
            </TableHead>
            <TableHead className="text-label-caps uppercase text-muted-foreground font-medium text-right">
              <SortHeader
                label="Amount"
                column="amount_cents"
                currentSort={sortBy}
                currentDir={sortDir}
                params={params}
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((tx) => (
            <TableRow key={tx.id} className="group hover:bg-muted/40 align-top">
              {/* Date — relative label, monospaced, muted */}
              <TableCell className="font-mono text-body-sm tabular-nums text-muted-foreground whitespace-nowrap pt-3">
                {formatRelativeDate(tx.date)}
              </TableCell>

              {/* Merchant + optional raw description + chips */}
              <TableCell className="pt-2.5">
                <p className="font-medium leading-snug">{tx.merchant_name ?? tx.description}</p>
                {tx.merchant_name && tx.merchant_name !== tx.description && (
                  <p className="text-xs text-muted-foreground truncate max-w-xs leading-snug">
                    {tx.description}
                  </p>
                )}
                {(tx.is_recurring || tx.category_source === 'manual') && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <RecurringBadge transactionId={tx.id} isRecurring={tx.is_recurring} />
                    <ManualBadge isManual={tx.category_source === 'manual'} />
                  </div>
                )}
              </TableCell>

              <TableCell className="pt-3">
                <CategoryCell
                  transactionId={tx.id}
                  merchantName={tx.merchant_name}
                  categoryId={tx.category_id}
                  categorySource={tx.category_source}
                  hasMerchantMapping={
                    tx.merchant_name !== null && mappedMerchants.has(tx.merchant_name)
                  }
                  categories={categories}
                />
              </TableCell>

              <TableCell className="text-sm text-muted-foreground pt-3">
                {tx.account?.name ?? '—'}
              </TableCell>

              <TableCell
                className={`font-mono text-body-sm tabular-nums text-right font-medium pt-3 ${
                  tx.amount_cents > 0 ? 'text-success' : ''
                }`}
              >
                {tx.amount_cents > 0 ? '+' : ''}
                {formatAmount(tx.amount_cents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
