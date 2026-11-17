import { Placeholder } from "@/components/landing/placeholder"

export function DemoSection() {
  return (
    <section aria-labelledby="demo" className="container mx-auto px-4 py-16 md:py-24">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-8">
        <div className="lg:col-span-4">
          <h2
            id="demo"
            className="text-4xl leading-none font-black tracking-tight text-balance md:text-5xl"
          >
            Mírala funcionando
          </h2>
          <p className="mt-4 max-w-sm text-lg leading-relaxed text-muted-foreground">
            Un recorrido corto: del registro a una sesión de entrenamiento.
          </p>
        </div>
        <div className="lg:col-span-8">
          <Placeholder label="Video: demo de 30 s" ratio="video" className="w-full" />
        </div>
      </div>
    </section>
  )
}
