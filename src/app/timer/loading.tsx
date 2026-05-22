import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm px-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[240px] w-[240px] rounded-full" />
        <Skeleton className="h-10 w-32" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-14 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  )
}
