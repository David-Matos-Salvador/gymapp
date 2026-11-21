import { SoundLinkButton } from "@/components/landing/sound-link-button"
import { WhatsappButton } from "@/components/landing/whatsapp-button"

export function CTASection({ whatsappUrl = null }: { whatsappUrl?: string | null }) {
  return (
    <section aria-labelledby="cta" className="bg-primary text-primary-foreground">
      <div className="container mx-auto flex flex-col gap-8 px-4 py-16 md:flex-row md:items-end md:justify-between md:py-20">
        <div className="max-w-2xl">
          <h2
            id="cta"
            className="text-4xl leading-none font-black tracking-tight text-balance md:text-6xl"
          >
            Arma tu rutina hoy.
          </h2>
          <p className="mt-4 text-lg leading-relaxed">
            Crea tu cuenta, responde unas preguntas y empieza a entrenar con un plan hecho para ti.
          </p>
          {whatsappUrl && (
            <p className="mt-2 text-base leading-relaxed">
              ¿Tienes un gimnasio o eres coach? Escríbenos.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-3 self-start sm:flex-row md:self-auto">
          <SoundLinkButton
            href="/register"
            sound="success"
            size="lg"
            className="h-12 shrink-0 self-start rounded-full bg-primary-foreground px-8 text-base text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-foreground md:self-auto [a]:hover:bg-primary-foreground/85"
          >
            Crear cuenta
          </SoundLinkButton>
          {whatsappUrl && (
            <WhatsappButton
              href={whatsappUrl}
              className="border-2 border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-foreground"
            />
          )}
        </div>
      </div>
    </section>
  )
}
