type EnvSource = Record<string, string | undefined>

// Origen público de la app para armar enlaces que se comparten fuera (invitaciones).
// Detrás del proxy, `request.url` trae la dirección interna del contenedor (0.0.0.0:3000),
// así que primero se usa la URL configurada y la del request queda solo como respaldo.
export function publicOrigin(request: Request, env: EnvSource = process.env): string {
  for (const value of [env.AUTH_URL, env.NEXT_PUBLIC_APP_URL]) {
    if (!value?.trim()) continue
    try {
      return new URL(value).origin
    } catch {
      // URL mal configurada: se prueba la siguiente.
    }
  }
  return new URL(request.url).origin
}

export function buildInviteUrl(origin: string, token: string): string {
  return `${origin}/invite/${token}`
}
