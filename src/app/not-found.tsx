import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SearchX } from "lucide-react"

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-6">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No encontramos esta página</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Puede que la dirección esté mal escrita o que la página ya no exista.
      </p>
      <Button asChild>
        <Link href="/dashboard">Ir al inicio</Link>
      </Button>
    </div>
  )
}
