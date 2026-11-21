import { Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { WhatsappButton } from "@/components/landing/whatsapp-button"

interface FreeSectionProps {
  features: string[]
  /** Sin número configurado no hay botón. */
  whatsappUrl?: string | null
}

// La app es gratis por ahora (David, 21/11): sin planes ni precios. Los gimnasios y los coaches
// piden su cuenta por WhatsApp; quienes entrenan la crean solos con el enlace de su gimnasio.
export function FreeSection({ features, whatsappUrl = null }: FreeSectionProps) {
  return (
    <section aria-labelledby="gratis" className="border-t">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <h2
              id="gratis"
              className="text-4xl leading-none font-black tracking-tight text-balance md:text-5xl"
            >
              Gratis por ahora
            </h2>
            <p className="mt-4 max-w-sm text-lg leading-relaxed text-muted-foreground">
              GymApp no cuesta nada: ni al gimnasio, ni a los coaches, ni a quienes entrenan.
            </p>
          </div>
          <div className="space-y-6 lg:col-span-8">
            <Card className="rounded-2xl py-6">
              <CardContent className="px-6">
                <p className="mb-4 font-bold">Incluye todo:</p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {features.map((feature) => (
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
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                ¿Tienes un gimnasio o eres coach? Escríbenos y te creamos la cuenta. Si entrenas,
                crea la tuya con el enlace de tu gimnasio.
              </p>
              {whatsappUrl && <WhatsappButton href={whatsappUrl} />}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
