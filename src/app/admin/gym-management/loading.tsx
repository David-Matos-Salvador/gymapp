import { AppShell } from "@/components/layout/shell"
import { Skeleton } from "@/components/ui/skeleton"

export default function GymManagementLoading() {
  return (
    <AppShell>
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </AppShell>
  )
}