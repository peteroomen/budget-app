import { getDashboardData } from '@/lib/queries/dashboard'
import { getFixedCostsSummary } from '@/lib/queries/recurring'
import { currentMonth, formatMonthLabel } from '@/lib/utils/month'
import { createClient } from '@/lib/supabase/server'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { IncomeVsSpendCards } from '@/components/dashboard/IncomeVsSpendCards'
import { SpendByCategoryChart } from '@/components/dashboard/SpendByCategoryChart'
import { TopMerchantsTable } from '@/components/dashboard/TopMerchantsTable'
import { FixedCostsCard } from '@/components/dashboard/FixedCostsCard'

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { month: monthParam } = await searchParams
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonth()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAdmin = user?.app_metadata?.role === 'admin'

  const [data, fixedCosts] = await Promise.all([
    getDashboardData(month),
    getFixedCostsSummary(month),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{formatMonthLabel(month)}</h1>
        <MonthSelector month={month} allowFuture={isAdmin} />
      </div>

      <IncomeVsSpendCards summary={data.summary} />

      <FixedCostsCard summary={fixedCosts} />

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
