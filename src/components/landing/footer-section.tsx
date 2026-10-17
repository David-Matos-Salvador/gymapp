import Link from "next/link"
import { Sparkles } from "lucide-react"

export function FooterSection() {
  return (
    <footer className="border-t py-10">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-accent-yellow" />
          GymApp &copy; {new Date().getFullYear()}
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground transition-colors">
            Iniciar sesión
          </Link>
          <Link href="/register" className="hover:text-foreground transition-colors">
            Registrarse
          </Link>
        </div>
      </div>
    </footer>
  )
}
