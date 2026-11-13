import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SoundLinkButton } from "@/components/landing/sound-link-button"
import { stats } from "@/constants/landing"
import { Flame, ArrowRight } from "lucide-react"

// Entrada del hero: animación CSS, para que el texto se vea sin esperar al JavaScript.
const enter = "animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both"

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14">
      <div className="hero-parallax absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-accent-yellow/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent-yellow/15 blur-[100px]" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-accent-yellow/15 blur-[80px]" />
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <div className={enter}>
          <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm mb-6">
            <Flame className="h-4 w-4 text-accent-yellow" />
            <span className="text-muted-foreground">Entrena con propósito</span>
          </span>
        </div>

        <h1
          className={`${enter} delay-100 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6`}
        >
          Transforma tu
          <br />
          <span className="text-accent-yellow">entrenamiento</span>
        </h1>

        <p
          className={`${enter} delay-200 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10`}
        >
          La plataforma inteligente que lleva tu gimnasio al siguiente nivel. Digitaliza
          operaciones, gestiona clientes y optimiza resultados.
        </p>

        <div className={`${enter} delay-300 flex flex-wrap items-center justify-center gap-4`}>
          <SoundLinkButton
            href="/register"
            sound="success"
            size="lg"
            className="h-12 px-8 text-base rounded-full"
          >
            Comenzar ahora
            <ArrowRight className="ml-2 h-5 w-5" />
          </SoundLinkButton>
          <Button size="lg" variant="outline" className="h-12 px-8 text-base rounded-full" asChild>
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>

        <div className="animate-in fade-in duration-700 ease-out delay-500 fill-mode-both mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
