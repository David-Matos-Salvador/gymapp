import { Skeleton } from "@/components/ui/skeleton"

export default function GymLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 h-12">
          <Skeleton className="h-4 w-16" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-8 space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-20 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </main>

      <footer className="border-t py-4">
        <Skeleton className="h-4 w-32 mx-auto" />
      </footer>
    </div>
  )
}
