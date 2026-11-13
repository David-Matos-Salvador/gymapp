import { Reveal } from "@/components/landing/reveal"
import type { LucideIcon } from "lucide-react"

interface Feature {
  icon: LucideIcon
  title: string
  description: string
  color: string
  bg: string
}

interface FeaturesSectionProps {
  features: Feature[]
}

export function FeaturesSection({ features }: FeaturesSectionProps) {
  return (
    <section className="relative py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <Reveal className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-accent-yellow">Características</span> de la plataforma
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Todo lo que necesitas para gestionar tu gimnasio de forma profesional, desde el check-in
            hasta el seguimiento corporal.
          </p>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 100}>
              <div className="relative group h-full rounded-2xl border bg-card p-6 md:p-8 transition-[translate,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg">
                <div className={`inline-flex rounded-xl p-3 ${feature.bg} mb-5`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
