import "dotenv/config"

/**
 * Contraseña de las cuentas demo del seed. Sale de `SEED_PASSWORD`, igual que en
 * `prisma/seed.ts`: no hay valor por defecto en el repo. En local va en `.env`; en la CI el
 * workflow genera un valor de prueba en cada corrida.
 */
function readSeedPassword(): string {
  const value = process.env.SEED_PASSWORD
  if (!value) {
    throw new Error(
      "Falta SEED_PASSWORD: ponla en .env (la misma con la que se corrió el seed) para correr la E2E."
    )
  }
  return value
}

export const SEED_PASSWORD = readSeedPassword()
