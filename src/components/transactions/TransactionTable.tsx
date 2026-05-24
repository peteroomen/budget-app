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
import { CategoryCell } from './CategoryCell'

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 2,
})

function formatAmount(cents: number): string {
  return nzd.format(cents / 100)
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
}

export function TransactionTable({
  rows,
  sortBy,
  sortDir,
  params,
  categories,
  mappedMerchants,
}: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No transactions found. Try adjusting your filters or{' '}
        <Link href="/import" className="underline">
          import a statement
        </Link>
        .
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-muted-foreground font-medium">
              <SortHeader
                label="Date"
                column="date"
                currentSort={sortBy}
                currentDir={sortDir}
                params={params}
              />
            </TableHead>
            <TableHead className="text-muted-foreground font-medium">
              <SortHeader
                label="Merchant / Description"
                column="merchant_name"
                currentSort={sortBy}
                currentDir={sortDir}
                params={params}
              />
            </TableHead>
            <TableHead className="text-muted-foreground font-medium">Category</TableHead>
            <TableHead className="text-muted-foreground font-medium">Account</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">
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
            <TableRow key={tx.id}>
              <TableCell className="tabular-nums text-muted-foreground whitespace-nowrap">
                {tx.date}
              </TableCell>
              <TableCell>
                <span className="font-medium">{tx.merchant_name ?? tx.description}</span>
                {tx.merchant_name && tx.merchant_name !== tx.description && (
                  <span className="block text-xs text-muted-foreground truncate max-w-xs">
                    {tx.description}
                  </span>
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
                className={`tabular-nums text-right font-medium ${
                  tx.amount_cents < 0 ? 'text-destructive' : 'text-green-700'
                }`}
              >
                {formatAmount(tx.amount_cents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
