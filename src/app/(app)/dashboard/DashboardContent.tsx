import Link from 'next/link'
import { getDashboardData } from '@/lib/queries/dashboard'
import { getFixedCostsSummary } from '@/lib/queries/recurring'
import { formatMonthLabel } from '@/lib/utils/month'
import { IncomeVsSpendCards } from '@/components/dashboard/IncomeVsSpendCards'
import { SpendByCategoryChart } from '@/components/dashboard/SpendByCategoryChart'
import { TopMerchantsTable } from '@/components/dashboard/TopMerchantsTable'
import { FixedCostsCard } from '@/components/dashboard/FixedCostsCard'

export async function DashboardContent({ month }: { month: string }) {
  const [data, fixedCosts] = await Promise.all([
    getDashboardData(month),
    getFixedCostsSummary(month),
  ])

  return (
    <>
      {data.summary.income_cents === 0 && data.summary.spend_cents === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No transactions for {formatMonthLabel(month)}.{' '}
          <Link href="/import" className="underline underline-offset-4 hover:text-foreground">
            Import a statement
          </Link>{' '}
          to get started.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <IncomeVsSpendCards summary={data.summary} />
        <FixedCostsCard summary={fixedCosts} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendByCategoryChart data={data.byCategory} />
        </div>
        <div>
          <TopMerchantsTable merchants={data.topMerchants} />
        </div>
      </div>
    </>
  )
}
