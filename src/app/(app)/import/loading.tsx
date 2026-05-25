import { Skeleton } from '@/components/ui/skeleton'

export default function ImportLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="space-y-4 max-w-lg">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  )
}
