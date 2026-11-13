import { Reveal } from "@/components/landing/reveal"
import { Play } from "lucide-react"

export function DemoSection() {
  return (
    <section className="relative py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <Reveal className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Mira GymApp en <span className="text-accent-yellow">acción</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Conoce la plataforma en menos de 2 minutos. Video demo aquí.
          </p>
        </Reveal>

        <Reveal delay={100} className="max-w-3xl mx-auto">
          <div className="aspect-video rounded-xl overflow-hidden shadow-xl border bg-card flex flex-col items-center justify-center gap-4">
            <Play className="h-16 w-16 text-accent-yellow/50" />
            <p className="text-lg font-medium text-muted-foreground">Video demo próximamente</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
