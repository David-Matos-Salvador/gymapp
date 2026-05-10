"use client"

import { useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, useScroll, useTransform } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useSound } from "@/hooks/use-sound"
import {
  Dumbbell,
  Sparkles,
  ChevronRight,
  Flame,
  Trophy,
  Users,
  ArrowRight,
  Zap,
  ClipboardList,
  TrendingUp,
  QrCode,
  CreditCard,
  Building2,
  Store,
  Check,
  Play,
} from "lucide-react"

const fadeIn = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
}

const features = [
  {
    icon: ClipboardList,
    title: "Ficha digital LATAM",
    description:
      "Digitaliza el expediente de tus clientes. Ideal para el cumplimiento normativo en Latinoamérica.",
    color: "text-gym-violet",
    bg: "bg-gym-violet/10",
  },
  {
    icon: Dumbbell,
    title: "Rutinas inteligentes",
    description:
      "Planes de entrenamiento personalizados que se adaptan al progreso de cada cliente.",
    color: "text-gym-green",
    bg: "bg-gym-green/10",
  },
  {
    icon: TrendingUp,
    title: "Seguimiento corporal",
    description:
      "Registra peso, medidas y porcentaje de grasa. Visualiza la evolución con gráficas.",
    color: "text-gym-orange",
    bg: "bg-gym-orange/10",
  },
  {
    icon: QrCode,
    title: "Control de acceso QR",
    description:
      "Check-in sin contacto. Controla quién entra y sale de tu gimnasio en tiempo real.",
    color: "text-gym-green",
    bg: "bg-gym-green/10",
  },
  {
    icon: CreditCard,
    title: "Gestión de membresías",
    description:
      "Administra pagos, renovaciones y vencimientos. Todo en un solo lugar.",
    color: "text-gym-violet",
    bg: "bg-gym-violet/10",
  },
  {
    icon: Building2,
    title: "Multi-sucursal",
    description:
      "Administra múltiples ubicaciones desde una sola plataforma unificada.",
    color: "text-gym-orange",
    bg: "bg-gym-orange/10",
  },
]

const steps = [
  {
    icon: Store,
    step: "1",
    title: "Registra tu gimnasio",
    description:
      "Crea tu cuenta en segundos y configura el perfil de tu gimnasio con tu información básica.",
    color: "text-gym-green",
    bg: "bg-gym-green/10",
  },
  {
    icon: Users,
    step: "2",
    title: "Agrega entrenadores y clientes",
    description:
      "Invita a tu equipo y comienza a digitalizar expedientes, rutinas y membresías sin complicaciones.",
    color: "text-gym-orange",
    bg: "bg-gym-orange/10",
  },
  {
    icon: Zap,
    step: "3",
    title: "Digitaliza tus operaciones",
    description:
      "Gestiona check-ins, pagos y seguimiento de clientes desde cualquier dispositivo, en cualquier momento.",
    color: "text-gym-violet",
    bg: "bg-gym-violet/10",
  },
]

const plans = [
  {
    name: "Básico",
    price: "$499",
    period: "/mes",
    description: "Ideal para gimnasios pequeños que inician su digitalización.",
    features: [
      "Hasta 50 clientes",
      "2 entrenadores",
      "Rutinas ilimitadas",
      "Check-in QR",
    ],
    cta: "Comenzar",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$999",
    period: "/mes",
    description: "Para gimnasios en crecimiento que necesitan analíticas avanzadas.",
    features: [
      "Hasta 200 clientes",
      "5 entrenadores",
      "Analíticas avanzadas",
      "Reportes exportables",
    ],
    cta: "Comenzar",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Cotizar",
    period: "",
    description: "Soluciones a medida para cadenas de gimnasios y franquicias.",
    features: [
      "Clientes ilimitados",
      "Multi-sucursal",
      "API de integración",
      "Soporte prioritario 24/7",
    ],
    cta: "Contactar",
    highlighted: false,
  },
]

const stats = [
  { value: "40+", label: "Ejercicios" },
  { value: "5", label: "Rutinas base" },
  { value: "24/7", label: "Disponible" },
]

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const { isAuthenticated, isAdmin, isTrainer, user } = useAuth()
  const { play } = useSound()
  const router = useRouter()

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") { router.replace("/super-admin"); return }
    if (isAdmin) { router.replace("/admin"); return }
    if (isTrainer) { router.replace("/coach"); return }
    if (isAuthenticated) { router.replace("/rutina"); return }
  }, [isAuthenticated, isAdmin, isTrainer, user, router])

  return (
    <div className="overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <Sparkles className="h-5 w-5 text-gym-green" />
            GymApp
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button asChild size="sm">
                <Link href="/dashboard" onClick={() => play("click")}>
                  Dashboard
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login" onClick={() => play("click")}>Iniciar sesión</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register" onClick={() => play("click")}>
                    Empezar gratis
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gym-green/20 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gym-violet/15 blur-[100px]" />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-gym-orange/15 blur-[80px]" />
        </motion.div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm mb-6">
              <Flame className="h-4 w-4 text-gym-orange" />
              <span className="text-muted-foreground">Entrena con propósito</span>
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            Transforma tu
            <br />
            <span className="text-gym-green">entrenamiento</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            La plataforma inteligente que lleva tu gimnasio al siguiente nivel. Digitaliza operaciones, gestiona clientes y optimiza resultados.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Button
              size="lg"
              asChild
              className="h-12 px-8 text-base rounded-full"
              onClick={() => play("success")}
            >
              <Link href="/register">
                Comenzar ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base rounded-full" asChild>
              <Link href="/login">
                Iniciar sesión
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-12"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Características */}
      <section className="relative py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-gym-green">Características</span> de la plataforma
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tu gimnasio de forma profesional, desde el check-in hasta el seguimiento corporal.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="relative group rounded-2xl border bg-card p-6 md:p-8 transition-shadow hover:shadow-lg"
              >
                <div className={`inline-flex rounded-xl p-3 ${feature.bg} mb-5`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="relative py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              ¿Cómo <span className="text-gym-orange">funciona</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Digitaliza tu gimnasio en tres simples pasos. Sin instalaciones complicadas ni hardware especializado.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative text-center"
              >
                {/* Connector line between steps (desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+3rem)] w-[calc(100%-6rem)] h-px bg-border" />
                )}
                <div className="relative z-10">
                  <div
                    className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${step.bg} mb-6`}
                  >
                    <step.icon className={`h-9 w-9 ${step.color}`} />
                  </div>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold mb-3">
                    {step.step}
                  </span>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo */}
      <section className="relative py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div {...fadeIn} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Mira GymApp en <span className="text-gym-violet">acción</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Conoce la plataforma en menos de 2 minutos. Video demo aquí.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-3xl mx-auto"
          >
            <div className="aspect-video rounded-xl overflow-hidden shadow-xl border">
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="Video demo de GymApp"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
              <Play className="h-3.5 w-3.5" />
              Video demo aquí — Este es un placeholder temporal.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Planes */}
      <section className="relative py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Planes para <span className="text-gym-green">gimnasios</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Elige el plan que mejor se adapte al tamaño de tu gimnasio. Escala cuando estés listo.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className={`relative rounded-2xl border p-6 md:p-8 flex flex-col transition-shadow hover:shadow-lg ${
                  plan.highlighted
                    ? "border-primary/50 bg-primary/5 shadow-md"
                    : "bg-card"
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
                      <Check className="h-4 w-4 text-gym-green mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  className="w-full rounded-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                  onClick={() => play(plan.name === "Enterprise" ? "click" : "success")}
                >
                  <Link href="/register">
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex justify-center"
          >
            <div className="relative rounded-2xl border bg-card p-8 md:p-12 max-w-2xl w-full text-center overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-gym-violet/10 blur-[60px]" />
              <div className="relative z-10">
                <Trophy className="h-12 w-12 text-gym-orange mx-auto mb-4" />
                <p className="text-3xl font-bold mb-2">Empieza gratis</p>
                <p className="text-muted-foreground mb-8">Sin tarjeta de crédito. Acceso completo por 7 días.</p>
                <Button
                  size="lg"
                  asChild
                  className="h-12 px-10 text-base rounded-full"
                  onClick={() => play("success")}
                >
                  <Link href="/register">
                    Crear cuenta gratis
                    <Zap className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-gym-green" />
            GymApp &copy; {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">Iniciar sesión</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Registrarse</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
