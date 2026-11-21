import Link from "next/link"
import { Sparkles } from "lucide-react"

export function FooterSection() {
  return (
    <footer className="border-t py-10">
      <div className="container mx-auto flex flex-col items-start justify-between gap-4 px-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-gold" aria-hidden />
          GymApp &copy; {new Date().getFullYear()}
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground transition-colors">
            Iniciar sesión
          </Link>
          <Link href="/register" className="hover:text-foreground transition-colors">
            Crear cuenta
          </Link>
        </div>
      </div>
    </footer>
  )
}
