import { isValidMonth } from '@/lib/utils/month'
import { Suspense } from 'react'
import { getFinancialSnapshot } from '@/lib/queries/financial-snapshot'
import { currentMonth, formatMonthLabel, monthDateRange } from '@/lib/utils/month'
import { DashboardContent } from './DashboardContent'
import { DashboardContentSkeleton } from './loading'

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { month: monthParam } = await searchParams
  const month = monthParam && isValidMonth(monthParam) ? monthParam : currentMonth()

  const { dateFrom, dateTo } = monthDateRange(month)

  const { household, transactions } = await getFinancialSnapshot(dateFrom, dateTo)
  const householdName = household.name
  const txCount = transactions.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-h1 font-medium">{formatMonthLabel(month)}</h1>
        <p className="mt-0.5 text-body-sm text-muted-foreground">
          {householdName} · {txCount} {txCount === 1 ? 'Transaction' : 'Transactions'}
        </p>
      </div>

      <p className="text-body-sm text-muted-foreground">
        Refunds reduce spending. Uncategorised credits are included provisionally in net cashflow
        and need review.
      </p>

      {/* key={month} resets the Suspense boundary so the skeleton shows on month change */}
      <Suspense key={month} fallback={<DashboardContentSkeleton />}>
        <DashboardContent month={month} />
      </Suspense>
    </div>
  )
}
