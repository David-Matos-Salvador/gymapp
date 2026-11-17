import { Skeleton } from "@/components/ui/skeleton"

/** Esqueleto de las pantallas de acceso (login, registro, invitación) mientras cargan. */
export function AuthCardSkeleton() {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center px-4"
      aria-busy="true"
      aria-label="Cargando"
    >
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-6 animate-pulse">
        <Skeleton className="mx-auto h-8 w-32" />
        <Skeleton className="mx-auto h-4 w-56" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="mx-auto h-4 w-40" />
      </div>
    </div>
  )
}
