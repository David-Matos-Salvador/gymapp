import type { LandingFeature } from "@/constants/landing"

interface StartSectionProps {
  steps: LandingFeature[]
}

// Los pasos del registro de quien entrena, en el orden en que la app los pide.
export function StartSection({ steps }: StartSectionProps) {
  return (
    <section aria-labelledby="como-empiezas" className="bg-muted">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <h2
          id="como-empiezas"
          className="max-w-2xl text-4xl leading-none font-black tracking-tight text-balance md:text-5xl"
        >
          De la cuenta nueva a tu primera serie
        </h2>
        <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((step, i) => (
            <li key={step.title}>
              <span
                aria-hidden
                className="flex size-12 items-center justify-center rounded-full bg-primary text-xl font-black text-primary-foreground tabular-nums"
              >
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
