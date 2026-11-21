import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SoundLinkButton } from "@/components/landing/sound-link-button"
import { Placeholder } from "@/components/landing/placeholder"
import { roles } from "@/constants/landing"

// Entrada del hero: animación CSS, para que el texto se vea sin esperar al JavaScript. Es el único
// movimiento automático de la portada.
const enter =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 duration-700 ease-out fill-mode-both"

export function HeroSection() {
  return (
    // El anillo de foco normal es amarillo: sobre este fondo se cambia a negro para que se vea.
    <section className="bg-primary pt-14 text-primary-foreground [&_a:focus-visible]:border-primary-foreground [&_a:focus-visible]:ring-primary-foreground/60 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-primary-foreground">
      <div className="container mx-auto grid gap-12 px-4 py-14 md:py-20 lg:grid-cols-12 lg:items-center lg:gap-8 lg:py-24">
        <div className="lg:col-span-7">
          <h1
            className={`${enter} text-[2.75rem] leading-[0.95] font-black tracking-tight text-balance sm:text-6xl lg:text-7xl xl:text-[5.5rem]`}
          >
            Tu rutina, tu coach y tu gimnasio en una sola app.
          </h1>
          <p className={`${enter} mt-6 max-w-xl text-lg leading-relaxed delay-150 md:text-xl`}>
            GymApp une a quienes entrenan, a sus coaches y a la administración del gimnasio. Está
            hecha para usarse en el celular, también entre serie y serie.
          </p>
          <div className={`${enter} mt-8 flex flex-wrap gap-3 delay-300`}>
            <SoundLinkButton
              href="/register"
              sound="success"
              size="lg"
              className="h-12 rounded-full bg-primary-foreground px-7 text-base text-primary hover:bg-primary-foreground/85 [a]:hover:bg-primary-foreground/85"
            >
              Crear cuenta
            </SoundLinkButton>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-primary-foreground/60 bg-transparent px-7 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground dark:border-primary-foreground/60 dark:bg-transparent dark:hover:bg-primary-foreground/10"
              asChild
            >
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
          <nav aria-label="Qué hace GymApp para ti" className={`${enter} mt-12 delay-500`}>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
              {roles.map((role) => (
                <li key={role.id}>
                  <a
                    href={`#${role.id}`}
                    className="underline decoration-primary-foreground/40 decoration-2 underline-offset-4 hover:decoration-primary-foreground"
                  >
                    {role.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="lg:col-span-5">
          <Placeholder
            label="Captura: Mi rutina en móvil"
            ratio="phone"
            onPrimary
            className="mx-auto w-56 sm:w-64 lg:w-72"
          />
        </div>
      </div>
    </section>
  )
}
