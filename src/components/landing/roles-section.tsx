import { Placeholder } from "@/components/landing/placeholder"
import type { LandingRole } from "@/constants/landing"

interface RolesSectionProps {
  roles: LandingRole[]
}

// Una sección por perfil: lo que la app hace para quien entrena, para el coach y para el admin.
export function RolesSection({ roles }: RolesSectionProps) {
  return (
    <div className="divide-y">
      {roles.map((role) => (
        <section
          key={role.id}
          id={role.id}
          aria-labelledby={`${role.id}-titulo`}
          className="container mx-auto scroll-mt-14 px-4 py-16 md:py-24"
        >
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <span aria-hidden className="mb-5 block h-2 w-12 rounded-full bg-primary" />
                <h2
                  id={`${role.id}-titulo`}
                  className="text-4xl leading-none font-black tracking-tight text-balance md:text-5xl"
                >
                  {role.title}
                </h2>
                <p className="mt-4 max-w-sm text-lg leading-relaxed text-muted-foreground">
                  {role.lede}
                </p>
              </div>
            </div>
            <div className="lg:col-span-8">
              <Placeholder
                label={role.screenshot.label}
                ratio={role.screenshot.ratio}
                className={role.screenshot.ratio === "phone" ? "w-56 sm:w-64" : "w-full"}
              />
              <ul className="mt-10 grid gap-x-10 sm:grid-cols-2">
                {role.features.map((feature) => (
                  <li key={feature.title} className="border-t py-5">
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </li>
                ))}
              </ul>
              {role.note && (
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {role.note}
                </p>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
