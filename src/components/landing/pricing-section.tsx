import { Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LandingPlan } from "@/constants/landing"
import { WhatsappButton } from "@/components/landing/whatsapp-button"

interface PricingSectionProps {
  plans: LandingPlan[]
  /** Sin número configurado no hay botón. */
  whatsappUrl?: string | null
}

// Hueco visible para un dato que David todavía tiene que definir (#137).
function PorDefinir({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-lg border-2 border-dashed border-foreground/25 px-3 py-1 text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}

export function PricingSection({ plans, whatsappUrl = null }: PricingSectionProps) {
  return (
    <section aria-labelledby="planes" className="border-t">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <h2
              id="planes"
              className="text-4xl leading-none font-black tracking-tight text-balance md:text-5xl"
            >
              Planes para gimnasios
            </h2>
            <p className="mt-4 max-w-sm text-lg leading-relaxed text-muted-foreground">
              Quienes entrenan y los coaches usan la app con la cuenta de su gimnasio.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:col-span-8">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={cn("gap-6 rounded-2xl py-6", plan.highlighted && "ring-2 ring-primary")}
              >
                <CardHeader className="px-6">
                  <CardTitle className="text-2xl font-black tracking-tight">{plan.name}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-6 px-6">
                  <p className="text-xl font-bold">
                    <PorDefinir>Precio por definir</PorDefinir>
                  </p>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 rounded-full bg-primary p-0.5 text-primary-foreground"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
            {whatsappUrl ? (
              <div className="flex flex-col items-start gap-3 md:col-span-2">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  ¿Quieres GymApp en tu gimnasio?
                </p>
                <WhatsappButton href={whatsappUrl} />
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground md:col-span-2">
                ¿Quieres GymApp en tu gimnasio? Escríbenos a{" "}
                <PorDefinir className="py-0 text-sm">contacto por definir</PorDefinir>.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
