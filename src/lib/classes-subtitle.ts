// Subtítulo de «Clases» según lo que cada perfil puede hacer ahí.
export function getClassesSubtitle(role: string): string {
  if (role === "MEMBER") return "Reserva tu lugar en clases grupales"
  if (role === "TRAINER") return "Gestiona tus clases o reserva en las de otros coaches"
  return "Clases grupales del gimnasio"
}
