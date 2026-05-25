import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { currentMonth, formatMonthLabel } from '@/lib/utils/month'
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
        <div>
          <h1 className="font-display text-[28px] font-medium leading-[1.15] tracking-[-0.018em]">
            {formatMonthLabel(month)}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Where the money went this month
          </p>
        </div>
        <MonthSelector month={month} isAdmin={isAdmin} />
      </div>

      {/* key={month} resets the Suspense boundary so the skeleton shows on month change */}
      <Suspense key={month} fallback={<DashboardContentSkeleton />}>
        <DashboardContent month={month} />
      </Suspense>
    </div>
  )
}
