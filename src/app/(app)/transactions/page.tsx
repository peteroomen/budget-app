import { isValidMonth, currentMonth, formatMonthLabel } from '@/lib/utils/month'
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
  month?: string
  account?: string
  sort?: string
  dir?: string
  q?: string
  cat?: string
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const month = typeof sp.month === 'string' && isValidMonth(sp.month) ? sp.month : currentMonth()
  const sortBy = parseSortBy(sp.sort)
  const sortDir = parseSortDir(sp.dir)

  const hasFilters = !!(sp.account || sp.q || sp.cat)

  // Two parallel fetches: total for the month (unfiltered) + filtered rows.
  // When no filters are active we skip the filtered query and reuse allMonth.
  const [accounts, allMonthTransactions, filteredTransactions, categories, mappedMerchants] =
    await Promise.all([
      getAccounts(),
      getTransactions({ month, sortBy, sortDir }),
      hasFilters
        ? getTransactions({
            month,
            ...(sp.account ? { accountId: sp.account } : {}),
            ...(sp.q ? { search: sp.q } : {}),
            ...(sp.cat ? { categoryId: sp.cat } : {}),
            sortBy,
            sortDir,
          })
        : null,
      getCategories(),
      getMappedMerchantNames(),
    ])

  const transactions = filteredTransactions ?? allMonthTransactions
  const totalCount = allMonthTransactions.length
  const filteredCount = transactions.length

  // URL params for sort link generation — preserve filters, keep month
  const urlParams = new URLSearchParams()
  urlParams.set('month', month)
  if (sp.account) urlParams.set('account', sp.account)
  if (sp.q) urlParams.set('q', sp.q)
  if (sp.cat) urlParams.set('cat', sp.cat)
  urlParams.set('sort', sortBy)
  urlParams.set('dir', sortDir)

  const subheading = `${filteredCount} of ${totalCount} · ${formatMonthLabel(month)}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="font-display text-display-h1 font-medium">Transactions</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">{subheading}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DetectRecurringButton />
          <RecategoriseButton />
        </div>
      </div>

      <Suspense>
        <TransactionFilters accounts={accounts} categories={categories} />
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
