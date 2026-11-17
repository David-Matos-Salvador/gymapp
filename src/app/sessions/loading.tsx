import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 animate-pulse">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-full max-w-sm" />
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  )
}
