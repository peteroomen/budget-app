import { Suspense } from 'react'
import { getAccounts } from '@/lib/queries/accounts'
import { getTransactions, type TransactionSortBy, type SortDir } from '@/lib/queries/transactions'
import { getCategories } from '@/lib/queries/categories'
import { getMappedMerchantNames } from '@/lib/queries/merchant-map'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { TransactionTable } from '@/components/transactions/TransactionTable'
import { TransactionDayList } from '@/components/transactions/TransactionDayList'
import { RecategoriseButton } from '@/components/transactions/RecategoriseButton'
import { DetectRecurringButton } from '@/components/transactions/DetectRecurringButton'

const VALID_SORT_COLS: TransactionSortBy[] = ['date', 'amount_cents', 'merchant_name']
const VALID_DIRS: SortDir[] = ['asc', 'desc']

function parseSortBy(value: string | undefined): TransactionSortBy {
  return VALID_SORT_COLS.includes(value as TransactionSortBy)
    ? (value as TransactionSortBy)
    : 'date'
}

function parseSortDir(value: string | undefined): SortDir {
  return VALID_DIRS.includes(value as SortDir) ? (value as SortDir) : 'desc'
}

interface SearchParams {
  account?: string
  from?: string
  to?: string
  sort?: string
  dir?: string
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const sortBy = parseSortBy(sp.sort)
  const sortDir = parseSortDir(sp.dir)

  const [accounts, transactions, categories, mappedMerchants] = await Promise.all([
    getAccounts(),
    getTransactions({
      ...(sp.account ? { accountId: sp.account } : {}),
      ...(sp.from ? { dateFrom: sp.from } : {}),
      ...(sp.to ? { dateTo: sp.to } : {}),
      sortBy,
      sortDir,
    }),
    getCategories(),
    getMappedMerchantNames(),
  ])

  const urlParams = new URLSearchParams()
  if (sp.account) urlParams.set('account', sp.account)
  if (sp.from) urlParams.set('from', sp.from)
  if (sp.to) urlParams.set('to', sp.to)
  urlParams.set('sort', sortBy)
  urlParams.set('dir', sortDir)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-h1 font-medium">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            {sp.account || sp.from || sp.to ? ' (filtered)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DetectRecurringButton />
          <RecategoriseButton />
        </div>
      </div>

      <Suspense>
        <TransactionFilters accounts={accounts} />
      </Suspense>

      {/* Mobile: day-grouped list */}
      <TransactionDayList rows={transactions} categories={categories} className="md:hidden" />

      {/* Desktop: sortable table */}
      <TransactionTable
        rows={transactions}
        sortBy={sortBy}
        sortDir={sortDir}
        params={urlParams}
        categories={categories}
        mappedMerchants={mappedMerchants}
        className="hidden md:block"
      />
    </div>
  )
}
