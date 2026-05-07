"use client"

import { useRef } from "react"
import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useSound } from "@/hooks/use-sound"
import {
  Dumbbell,
  BarChart3,
  CalendarDays,
  Sparkles,
  ChevronRight,
  Flame,
  Trophy,
  Users,
  ArrowRight,
  Zap,
} from "lucide-react"

const fadeIn = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
}

const features = [
  {
    icon: Dumbbell,
    title: "Rutinas inteligentes",
    description: "Planes de entrenamiento personalizados que se adaptan a tu progreso semana a semana.",
    color: "text-gym-green",
    bg: "bg-gym-green/10",
  },
  {
    icon: BarChart3,
    title: "Tracking de progreso",
    description: "Visualiza tu evolución con métricas detalladas de fuerza, volumen y consistencia.",
    color: "text-gym-orange",
    bg: "bg-gym-orange/10",
  },
  {
    icon: CalendarDays,
    title: "Clases en vivo",
    description: "Reserva tu lugar en clases grupales con entrenadores certificados.",
    color: "text-gym-violet",
    bg: "bg-gym-violet/10",
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
  const { isAuthenticated } = useAuth()
  const { play } = useSound()

  return (
    <div className="overflow-x-hidden">
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
            La plataforma inteligente que lleva tu rutina de gimnasio al siguiente nivel. Registra, analiza y optimiza cada entrenamiento.
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

      <section className="relative py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para{" "}
              <span className="text-gym-green">progresar</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Herramientas diseñadas para atletas y coaches que buscan resultados reales.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="relative group rounded-2xl border bg-card p-8 transition-shadow hover:shadow-lg"
              >
                <div className={`inline-flex rounded-xl p-3 ${feature.bg} mb-6`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Listo para transformar tu{" "}
              <span className="text-gym-orange">fitness</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Únete a atletas que ya están mejorando sus resultados con GymApp.
            </p>
          </motion.div>

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
