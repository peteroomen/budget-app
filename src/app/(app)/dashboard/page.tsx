import Link from 'next/link'
import { getDashboardData } from '@/lib/queries/dashboard'
import { currentMonth, formatMonthLabel } from '@/lib/utils/month'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { IncomeVsSpendCards } from '@/components/dashboard/IncomeVsSpendCards'
import { SpendByCategoryChart } from '@/components/dashboard/SpendByCategoryChart'
import { TopMerchantsTable } from '@/components/dashboard/TopMerchantsTable'

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { month: monthParam } = await searchParams
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonth()

  const data = await getDashboardData(month)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{formatMonthLabel(month)}</h1>
        <MonthSelector month={month} />
      </div>

      {data.summary.income_cents === 0 && data.summary.spend_cents === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No transactions for {formatMonthLabel(month)}.{' '}
          <Link href="/import" className="underline underline-offset-4 hover:text-foreground">
            Import a statement
          </Link>{' '}
          to get started.
        </div>
      )}

      <IncomeVsSpendCards summary={data.summary} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendByCategoryChart data={data.byCategory} />
        </div>
        <div>
          <TopMerchantsTable merchants={data.topMerchants} />
        </div>
      </div>
    </div>
  )
}
