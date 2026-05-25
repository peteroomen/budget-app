import { Skeleton } from '@/components/ui/skeleton'

export default function CategoriesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="rounded-md border">
        <div className="border-b bg-muted/50 px-4 py-3 flex gap-8">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b last:border-0 px-4 py-3 flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full shrink-0" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-4 w-14" />
            <div className="ml-auto flex gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
