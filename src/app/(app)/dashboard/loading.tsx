import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-36" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Income / Spend / Net cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border p-6 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Fixed costs card */}
      <div className="rounded-lg border p-6 space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3 w-44" />
      </div>

      {/* Chart + merchants grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border p-6 space-y-3">
          <Skeleton className="h-5 w-40" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-24 shrink-0" />
              <Skeleton className="h-5" style={{ width: `${60 - i * 8}%` }} />
            </div>
          ))}
        </div>
        <div className="rounded-lg border p-6 space-y-3">
          <Skeleton className="h-5 w-32" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
