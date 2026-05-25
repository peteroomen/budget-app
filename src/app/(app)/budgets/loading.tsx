import { Skeleton } from '@/components/ui/skeleton'

export default function BudgetsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-3">
            {['w-28', 'w-20', 'w-20', 'w-32', 'w-16'].map((w, i) => (
              <Skeleton key={i} className={`h-4 ${w}`} />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b last:border-0 px-4 py-3">
              <Skeleton className="h-4 w-28 shrink-0" />
              <Skeleton className="h-4 w-20 shrink-0" />
              <Skeleton className="h-4 w-20 shrink-0" />
              <Skeleton className="h-3 w-32 shrink-0 rounded-full" />
              <Skeleton className="h-8 w-16 shrink-0 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
