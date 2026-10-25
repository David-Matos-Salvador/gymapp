# Credenciales locales — GymApp (plantilla)

Copia este archivo a `CREDENTIALS.md` (ignorado por git) y complétalo **solo en tu máquina**.
Nunca subas contraseñas, secretos ni URLs con contraseña al repo.

## Usuarios demo

Los crea `npm run db:seed` (`prisma/seed.ts`): 1 super admin, 1 admin, 2 trainers y 10 miembros
con distintos escenarios (sin onboarding, membresía vencida, power user...). Los correos y la
contraseña demo están en el seed. **La contraseña demo nunca se usa en producción.**

## Base de datos local

| Campo                | Valor                                                    |
| -------------------- | -------------------------------------------------------- |
| Host                 | `localhost:5432`                                         |
| Base                 | `gymdb`                                                  |
| Usuario / contraseña | los de tu `.env` (`POSTGRES_USER` / `POSTGRES_PASSWORD`) |

## Variables de entorno

Ver `.env.example`. QA y producción tienen sus valores en Coolify (Environment Variables).
