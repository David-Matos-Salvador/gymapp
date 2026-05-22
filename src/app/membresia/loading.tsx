import { Skeleton } from "@/components/ui/skeleton"

export default function MembresiaLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-lg space-y-6 animate-pulse">
      <div className="text-center space-y-2">
        <Skeleton className="h-7 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
