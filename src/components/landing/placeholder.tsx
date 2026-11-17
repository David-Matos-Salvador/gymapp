import { ImageIcon, Play } from "lucide-react"
import { cn } from "@/lib/utils"

// Hueco reservado para una captura o un video de la app (#137). La proporción es fija para que
// la imagen real ocupe el mismo espacio y la página no salte al reemplazarlo.
const ratios = {
  phone: "aspect-[9/19.5]",
  desktop: "aspect-[16/10]",
  video: "aspect-video",
}

interface PlaceholderProps {
  label: string
  ratio: keyof typeof ratios
  /** Sobre el fondo amarillo de la portada. */
  onPrimary?: boolean
  className?: string
}

export function Placeholder({ label, ratio, onPrimary, className }: PlaceholderProps) {
  const Icon = ratio === "video" ? Play : ImageIcon
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center",
        onPrimary
          ? "border-primary-foreground/40 bg-primary-foreground/5 text-primary-foreground/70"
          : "border-foreground/20 bg-muted text-muted-foreground",
        ratios[ratio],
        className
      )}
    >
      <Icon className="size-8" aria-hidden />
      <p className="max-w-[16rem] text-sm font-medium text-balance">{label}</p>
    </div>
  )
}
