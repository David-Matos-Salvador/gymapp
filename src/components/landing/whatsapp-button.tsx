import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** «Escríbenos por WhatsApp» para gimnasios interesados. Abre WhatsApp en otra pestaña. */
export function WhatsappButton({ href, className }: { href: string; className?: string }) {
  return (
    <Button asChild size="lg" className={cn("h-12 rounded-full px-8 text-base", className)}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle aria-hidden className="size-5" />
        Escríbenos por WhatsApp
      </a>
    </Button>
  )
}
