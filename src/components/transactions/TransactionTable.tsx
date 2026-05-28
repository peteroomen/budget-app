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
import { Badge } from '@/components/ui/badge'
import { CategoryCell } from './CategoryCell'
import { RecurringBadge } from './RecurringBadge'
import { ManualBadge } from './ManualBadge'
import { DeleteTransactionButton } from './DeleteTransactionButton'
import { NotePopover } from './NotePopover'

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
        <TableHeader className="[&_tr]:border-0">
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="text-[11px] tracking-[0.4px] uppercase font-medium text-muted-foreground w-28">
              <SortHeader
                label="Date"
                column="date"
                currentSort={sortBy}
                currentDir={sortDir}
                params={params}
              />
            </TableHead>
            <TableHead className="text-[11px] tracking-[0.4px] uppercase font-medium text-muted-foreground">
              <SortHeader
                label="Merchant"
                column="merchant_name"
                currentSort={sortBy}
                currentDir={sortDir}
                params={params}
              />
            </TableHead>
            <TableHead className="text-[11px] tracking-[0.4px] uppercase font-medium text-muted-foreground min-w-[11rem]">
              Category
            </TableHead>
            <TableHead className="text-[11px] tracking-[0.4px] uppercase font-medium text-muted-foreground">
              Account
            </TableHead>
            <TableHead className="text-[11px] tracking-[0.4px] uppercase font-medium text-muted-foreground text-right">
              <SortHeader
                label="Amount"
                column="amount_cents"
                currentSort={sortBy}
                currentDir={sortDir}
                params={params}
              />
            </TableHead>
            <TableHead className="w-9" aria-label="Actions" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((tx) => {
            const isTransfer = tx.category?.type === 'transfer'
            return (
              <TableRow
                key={tx.id}
                className={cn(
                  'group hover:bg-muted/40 align-top',
                  isTransfer && 'text-muted-foreground'
                )}
              >
                <TableCell className="font-mono text-body-sm tabular-nums text-muted-foreground whitespace-nowrap">
                  {formatRelativeDate(tx.date)}
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className={cn('font-medium leading-snug', isTransfer && 'font-normal')}>
                      {tx.merchant_name ?? tx.description}
                    </p>
                    {isTransfer && (
                      <Badge variant="outline" className="font-normal">
                        Transfer
                      </Badge>
                    )}
                    {!tx.notes && (
                      <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <NotePopover
                          transactionId={tx.id}
                          merchantLabel={tx.merchant_name ?? tx.description}
                          initialNote={tx.notes}
                        />
                      </span>
                    )}
                  </div>
                  {tx.notes && (
                    <div className="mt-0.5 flex items-start gap-1">
                      <p className="font-display italic text-label leading-snug text-muted-foreground line-clamp-2">
                        {tx.notes}
                      </p>
                      <NotePopover
                        transactionId={tx.id}
                        merchantLabel={tx.merchant_name ?? tx.description}
                        initialNote={tx.notes}
                      />
                    </div>
                  )}
                  {(tx.is_recurring || tx.category_source === 'manual') && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <RecurringBadge transactionId={tx.id} isRecurring={tx.is_recurring} />
                      <ManualBadge isManual={tx.category_source === 'manual'} />
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  <CategoryCell
                    transactionId={tx.id}
                    merchantName={tx.merchant_name}
                    categoryId={tx.category_id}
                    hasMerchantMapping={
                      tx.merchant_name !== null && mappedMerchants.has(tx.merchant_name)
                    }
                    categories={categories}
                  />
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {tx.account?.name ?? '—'}
                </TableCell>

                <TableCell
                  className={`font-mono text-body-sm tabular-nums text-right font-medium ${
                    tx.amount_cents > 0 ? 'text-success' : ''
                  }`}
                >
                  {tx.amount_cents > 0 ? '+' : ''}
                  {formatAmount(tx.amount_cents)}
                </TableCell>

                <TableCell className="w-9 p-0 pr-2">
                  <div className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <DeleteTransactionButton
                      transactionId={tx.id}
                      label={tx.merchant_name ?? tx.description}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
