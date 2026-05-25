import { Suspense } from 'react'
import { currentMonth, formatMonthLabel } from '@/lib/utils/month'
import { createClient } from '@/lib/supabase/server'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { DashboardContent } from './DashboardContent'
import { DashboardContentSkeleton } from './loading'

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{formatMonthLabel(month)}</h1>
        <MonthSelector month={month} allowFuture={isAdmin} />
      </div>

      <Suspense key={month} fallback={<DashboardContentSkeleton />}>
        <DashboardContent month={month} />
      </Suspense>
    </div>
  )
}
