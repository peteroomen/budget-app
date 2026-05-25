import { Skeleton } from '@/components/ui/skeleton'

export default function SummaryLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Monthly Summary</h1>
        <Skeleton className="h-9 w-[200px]" />
      </div>

      <Skeleton className="h-20 w-full rounded-lg" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>

      <Skeleton className="h-32 rounded-lg" />
    </div>
  )
}
