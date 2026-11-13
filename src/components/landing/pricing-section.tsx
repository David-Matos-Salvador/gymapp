import { Reveal } from "@/components/landing/reveal"
import { SoundLinkButton } from "@/components/landing/sound-link-button"
import { ArrowRight, Check } from "lucide-react"

interface Plan {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  highlighted: boolean
}

interface PricingSectionProps {
  plans: Plan[]
}

export function PricingSection({ plans }: PricingSectionProps) {
  return (
    <section className="relative py-20 md:py-32">
      <div className="container mx-auto px-4">
        <Reveal className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Planes para <span className="text-accent-yellow">gimnasios</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Elige el plan que mejor se adapte al tamaño de tu gimnasio. Escala cuando estés listo.
          </p>
        </Reveal>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 100}>
              <div
                className={`relative h-full rounded-2xl border p-6 md:p-8 flex flex-col transition-[translate,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg ${
                  plan.highlighted ? "border-primary/50 bg-primary/5 shadow-md" : "bg-card"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Más popular
                  </span>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-lg">{plan.period}</span>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-accent-yellow mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <SoundLinkButton
                  href="/register"
                  sound={plan.name === "Enterprise" ? "click" : "success"}
                  size="lg"
                  className="w-full rounded-full"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </SoundLinkButton>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
