export interface LoginForm {
  email: string
  password: string
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Validación del login hecha a mano: dos campos no justifican cargar zod (~290 KB de
// JavaScript) en la primera pantalla que ve casi todo el mundo. Las credenciales se
// comprueban de verdad en el servidor.
export function validateLogin(
  values: Partial<LoginForm>
): Partial<Record<keyof LoginForm, string>> {
  const errors: Partial<Record<keyof LoginForm, string>> = {}
  if (!EMAIL.test(values.email ?? "")) errors.email = "Correo inválido"
  if ((values.password ?? "").length < 6) errors.password = "Mínimo 6 caracteres"
  return errors
}

// A dónde va cada perfil al iniciar sesión sin `callbackUrl`. Coach y admin van directo a su
// inicio: antes pasaban por /my-routine (y su pantalla de carga de miembro) y por /admin o /coach.
export function homeAfterLogin(role: string | undefined): string {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "TRAINER"
    ? "/dashboard"
    : "/my-routine"
}
