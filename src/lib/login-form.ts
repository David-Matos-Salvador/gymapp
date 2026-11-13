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
  if (!EMAIL.test(values.email ?? "")) errors.email = "Email inválido"
  if ((values.password ?? "").length < 6) errors.password = "Mínimo 6 caracteres"
  return errors
}
