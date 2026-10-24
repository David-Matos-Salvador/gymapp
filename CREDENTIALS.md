# Credenciales — GymApp

> **Password universal**: `demo123`

## Staff

| Rol         | Email                   |
| ----------- | ----------------------- |
| Super Admin | `superadmin@gymapp.com` |
| Admin       | `admin@gymapp.com`      |
| Trainer     | `trainer@gymapp.com`    |

## Miembros

| Perfil       | Email                  | Escenario                             |
| ------------ | ---------------------- | ------------------------------------- |
| 🆕 Laura     | `laura@gymapp.com`     | Recién registrada, sin onboarding     |
| 🏋️ Diego     | `diego@gymapp.com`     | Coach asignado, sin onboarding aún    |
| 📋 Valentina | `valentina@gymapp.com` | Onboarding completo, sin plan elegido |
| 🌱 Mateo     | `mateo@gymapp.com`     | Plan activo, 0 workouts               |
| ⚠️ Sofía     | `sofia@gymapp.com`     | Membresía EXPIRADA                    |
| 🚫 Ricardo   | `ricardo@gymapp.com`   | Membresía INACTIVA                    |
| 💪 Carlos    | `carlos@gymapp.com`    | Power user, 3 workouts esta semana    |
| 🔥 Ana       | `ana@gymapp.com`       | Activa, 1 workout esta semana         |
| 🏆 Pedro     | `pedro@gymapp.com`     | Avanzado, workouts esporádicos        |

## Base de datos

| Campo        | Valor                                                                 |
| ------------ | --------------------------------------------------------------------- |
| Host         | `localhost:5432`                                                      |
| User         | `gymuser`                                                             |
| Password     | `gympassword`                                                         |
| Database     | `gymdb`                                                               |
| URL completa | `postgresql://gymuser:gympassword@localhost:5432/gymdb?schema=public` |

## Auth / Entorno

Las credenciales reales viven en `.env.local` o en el gestor de secretos del servidor. No se commitean.

| Variable                | Valor                                 |
| ----------------------- | ------------------------------------- |
| `AUTH_SECRET`           | ver `.env.local` / gestor de secretos |
| `AUTH_URL`              | URL del entorno                       |
| `NEXT_PUBLIC_APP_URL`   | URL del entorno                       |
| `AUTH_GOOGLE_ID`        | ver `.env.local` / gestor de secretos |
| `AUTH_GOOGLE_SECRET`    | ver `.env.local` / gestor de secretos |
| `STRIPE_SECRET_KEY`     | ver `.env.local` / gestor de secretos |
| `STRIPE_WEBHOOK_SECRET` | ver `.env.local` / gestor de secretos |
