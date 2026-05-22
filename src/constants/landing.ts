import {
  Dumbbell,
  ClipboardList,
  TrendingUp,
  QrCode,
  CreditCard,
  Building2,
  Store,
  Users,
  Zap,
} from "lucide-react"

export const fadeIn = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
}

export const features = [
  {
    icon: ClipboardList,
    title: "Ficha digital LATAM",
    description:
      "Digitaliza el expediente de tus clientes. Ideal para el cumplimiento normativo en Latinoamérica.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
  },
  {
    icon: Dumbbell,
    title: "Rutinas inteligentes",
    description:
      "Planes de entrenamiento personalizados que se adaptan al progreso de cada cliente.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
  },
  {
    icon: TrendingUp,
    title: "Seguimiento corporal",
    description:
      "Registra peso, medidas y porcentaje de grasa. Visualiza la evolución con gráficas.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
  },
  {
    icon: QrCode,
    title: "Control de acceso QR",
    description:
      "Check-in sin contacto. Controla quién entra y sale de tu gimnasio en tiempo real.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
  },
  {
    icon: CreditCard,
    title: "Gestión de membresías",
    description:
      "Administra pagos, renovaciones y vencimientos. Todo en un solo lugar.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
  },
  {
    icon: Building2,
    title: "Multi-sucursal",
    description:
      "Administra múltiples ubicaciones desde una sola plataforma unificada.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
  },
]

export const steps = [
  {
    icon: Store,
    step: "1",
    title: "Registra tu gimnasio",
    description:
      "Crea tu cuenta en segundos y configura el perfil de tu gimnasio con tu información básica.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
  },
  {
    icon: Users,
    step: "2",
    title: "Agrega entrenadores y clientes",
    description:
      "Invita a tu equipo y comienza a digitalizar expedientes, rutinas y membresías sin complicaciones.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
  },
  {
    icon: Zap,
    step: "3",
    title: "Digitaliza tus operaciones",
    description:
      "Gestiona check-ins, pagos y seguimiento de clientes desde cualquier dispositivo, en cualquier momento.",
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
  },
]

export const plans = [
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

export const stats = [
  { value: "40+", label: "Ejercicios" },
  { value: "5", label: "Rutinas base" },
  { value: "24/7", label: "Disponible" },
]
