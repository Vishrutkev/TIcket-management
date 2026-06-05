import { Skeleton } from '@/components/ui/skeleton'

export default function DetailPageSkeleton() {
  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
      <div className="w-64 shrink-0 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
