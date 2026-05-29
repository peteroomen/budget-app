import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { currentMonth, monthDateRange } from '@/lib/utils/month'
import { DashboardMonthNav } from './DashboardMonthNav'
import { DashboardContent } from './DashboardContent'
import { DashboardContentSkeleton } from './loading'

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { month: monthParam } = await searchParams
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonth()

  const supabase = await createClient()
  const { dateFrom, dateTo } = monthDateRange(month)

  const [
    {
      data: { user },
    },
    { data: household },
    { count: transactionCount },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('households').select('name').maybeSingle(),
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .gte('date', dateFrom)
      .lte('date', dateTo),
  ])

  const isAdmin = user?.app_metadata?.role === 'admin'
  const householdName = household?.name ?? 'My Household'
  const txCount = transactionCount ?? 0

  return (
    <div className="space-y-6">
      <div>
        <DashboardMonthNav month={month} isAdmin={isAdmin} />
        <p className="mt-0.5 text-body-sm text-muted-foreground">
          {householdName} · {txCount} {txCount === 1 ? 'Transaction' : 'Transactions'}
        </p>
      </div>

      {/* key={month} resets the Suspense boundary so the skeleton shows on month change */}
      <Suspense key={month} fallback={<DashboardContentSkeleton />}>
        <DashboardContent month={month} />
      </Suspense>
    </div>
  )
}
