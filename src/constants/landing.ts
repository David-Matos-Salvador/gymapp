// Textos de la portada. Solo se cuenta lo que la app hace hoy (#137): antes de agregar una
// función aquí, comprobar que existe. Lo que tiene la etiqueta `despues-de-produccion` (Stripe,
// avisos push, días fijos) no se anuncia.

export interface LandingFeature {
  title: string
  description: string
}

export interface LandingRole {
  id: string
  title: string
  lede: string
  screenshot: { label: string; ratio: "phone" | "desktop" }
  features: LandingFeature[]
  note?: string
}

export const roles: LandingRole[] = [
  {
    id: "si-entrenas",
    title: "Si entrenas",
    lede: "Tu plan de entrenamiento y todo lo del gimnasio, en el celular.",
    screenshot: { label: "Captura: pantalla de entrenar en móvil", ratio: "phone" },
    features: [
      {
        title: "Una rutina pensada para ti",
        description:
          "Respondes unas preguntas sobre tu experiencia, los días que puedes entrenar y tu objetivo. Una IA te recomienda la rutina que más te conviene y te explica por qué.",
      },
      {
        title: "Entrena serie por serie",
        description:
          "Sigue la rutina del día y anota el peso y las repeticiones de cada serie. Todo queda en tu historial.",
      },
      {
        title: "Tu progreso a la vista",
        description: "Registra tu peso y tus medidas, y mira tu IMC y su evolución en gráficos.",
      },
      {
        title: "Clases y sesiones 1:1",
        description:
          "Reserva tu lugar en las clases mientras haya cupo, y pide una hora a solas con tu coach.",
      },
      {
        title: "Tu membresía al día",
        description:
          "Mira tu plan y cuándo vence. Paga con Yape o transferencia subiendo el comprobante, o en efectivo o con tarjeta en recepción.",
      },
      {
        title: "Las máquinas de tu gimnasio",
        description: "Consulta el equipamiento de tu gimnasio con el número de cada máquina.",
      },
    ],
  },
  {
    id: "si-eres-coach",
    title: "Si eres coach",
    lede: "Tus clientes, sus rutinas y tu agenda en un mismo lugar.",
    screenshot: { label: "Captura: agenda del coach en escritorio", ratio: "desktop" },
    features: [
      {
        title: "La ficha de cada cliente",
        description:
          "Sus datos, sus notas médicas, sus medidas y su IMC. Registras nuevas medidas desde la misma ficha.",
      },
      {
        title: "Rutinas personalizadas",
        description: "Crea rutinas nuevas o adapta una rutina base para un cliente y asígnasela.",
      },
      {
        title: "Tu agenda",
        description:
          "Define tus horarios de atención y tus clientes reservan sesiones 1:1 en las horas libres.",
      },
      {
        title: "Conexión con Google Calendar",
        description: "Conecta tu calendario y las horas que ya tienes ocupadas dejan de ofrecerse.",
      },
      {
        title: "Tus clases",
        description: "Crea clases con su horario y su capacidad, y mira quiénes se inscribieron.",
      },
      {
        title: "Invitaciones",
        description: "Suma clientes nuevos con un enlace de invitación.",
      },
    ],
  },
  {
    id: "si-administras",
    title: "Si administras un gimnasio",
    lede: "Membresías, pagos, miembros y equipamiento, con un resumen de lo que pasa cada día.",
    screenshot: { label: "Captura: panel del admin en escritorio", ratio: "desktop" },
    features: [
      {
        title: "El resumen de tu gimnasio",
        description: "Las membresías por vencer y la actividad reciente de tus miembros.",
      },
      {
        title: "Planes de membresía en soles",
        description: "Crea tus planes con su precio y su duración.",
      },
      {
        title: "Pagos en orden",
        description:
          "Aprueba los comprobantes de Yape y transferencia, y registra los pagos en efectivo o con tarjeta.",
      },
      {
        title: "Miembros",
        description: "Da de alta a tus miembros y consulta el directorio del gimnasio.",
      },
      {
        title: "Equipamiento numerado",
        description:
          "Registra tus máquinas con su número y su ubicación para que todos las encuentren.",
      },
      {
        title: "La página de tu gimnasio",
        description: "Una página pública con tus datos de contacto y tus planes.",
      },
    ],
    note: "Y quien opera la plataforma tiene su propio panel para crear gimnasios, asignarles un administrador y ver los ingresos.",
  },
]

export const steps: LandingFeature[] = [
  {
    title: "Crea tu cuenta",
    description: "Solo necesitas tu nombre, tu correo y una contraseña.",
  },
  {
    title: "Cuéntanos de ti",
    description:
      "Tu experiencia, los días que puedes entrenar, tu objetivo y, si quieres, tus medidas.",
  },
  {
    title: "Elige tu rutina",
    description:
      "La IA te recomienda una de las opciones y te explica por qué. La decisión es tuya.",
  },
  {
    title: "Entrena",
    description: "Abre la rutina del día y anota cada serie mientras entrenas.",
  },
]

export interface LandingPlan {
  name: string
  description: string
  features: string[]
  highlighted: boolean
}

// Los precios todavía no están definidos (David, 17/11): se muestra «Precio por definir».
export const plans: LandingPlan[] = [
  {
    name: "Básico",
    description: "Para gimnasios que empiezan a llevar su día a día en la app.",
    features: [
      "Rutinas, entrenamiento e historial para tus miembros",
      "Membresías con Yape, transferencia y pago en recepción",
      "Clases con reservas y cupos",
      "Equipamiento numerado",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    description: "Para gimnasios con coaches que siguen a sus clientes de cerca.",
    features: [
      "Todo lo del plan Básico",
      "Agenda del coach con sesiones 1:1",
      "Conexión con Google Calendar",
      "Rutina recomendada por IA al registrarse",
    ],
    highlighted: true,
  },
]
