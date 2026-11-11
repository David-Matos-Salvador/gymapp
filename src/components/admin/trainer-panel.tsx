import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Dumbbell, UserRound } from "lucide-react"

export interface TrainerRow {
  id: string
  name: string | null
  email: string
  clientCount: number
}

export function TrainerPanel({ trainers }: { trainers: TrainerRow[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-accent-yellow" />
          Coaches del gimnasio
        </h2>
        <p className="text-sm text-muted-foreground">
          Coaches asignados a este gimnasio y cantidad de clientes.
        </p>
      </div>

      {trainers.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState message="No hay coaches en este gimnasio" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {trainers.map((trainer) => (
            <div key={trainer.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-yellow/10">
                <UserRound className="h-4 w-4 text-accent-yellow" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{trainer.name ?? "Sin nombre"}</p>
                <p className="text-xs text-muted-foreground truncate">{trainer.email}</p>
                <p className="text-[10px] text-muted-foreground">
                  {trainer.clientCount} cliente{trainer.clientCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
