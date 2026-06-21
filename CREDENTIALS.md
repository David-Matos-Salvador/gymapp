# Credenciales — GymApp

> **Password universal**: `demo123`

## Staff

| Rol | Email |
|---|---|
| Super Admin | `superadmin@gymapp.com` |
| Admin | `admin@gymapp.com` |
| Trainer | `trainer@gymapp.com` |

## Miembros

| Perfil | Email | Escenario |
|---|---|---|
| 🆕 Laura | `laura@gymapp.com` | Recién registrada, sin onboarding |
| 🏋️ Diego | `diego@gymapp.com` | Coach asignado, sin onboarding aún |
| 📋 Valentina | `valentina@gymapp.com` | Onboarding completo, sin plan elegido |
| 🌱 Mateo | `mateo@gymapp.com` | Plan activo, 0 workouts |
| ⚠️ Sofía | `sofia@gymapp.com` | Membresía EXPIRADA |
| 🚫 Ricardo | `ricardo@gymapp.com` | Membresía INACTIVA |
| 💪 Carlos | `carlos@gymapp.com` | Power user, 3 workouts esta semana |
| 🔥 Ana | `ana@gymapp.com` | Activa, 1 workout esta semana |
| 🏆 Pedro | `pedro@gymapp.com` | Avanzado, workouts esporádicos |

## Base de datos

| Campo | Valor |
|---|---|
| Host | `localhost:5432` |
| User | `gymuser` |
| Password | `gympassword` |
| Database | `gymdb` |
| URL completa | `postgresql://gymuser:gympassword@localhost:5432/gymdb?schema=public` |

## Auth / Entorno

| Variable | Valor |
|---|---|
| `AUTH_SECRET` | `hiTXOFdVPhNNc0eZoTseTtnAikyix8lU+vk8EUSu4gI=` |
| `AUTH_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | `675239987109-oq1qijd4tof7ilb5ja1jhrgcmc5dvu3n.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | `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` |
| `STRIPE_SECRET_KEY` | *(vacío)* |
| `STRIPE_WEBHOOK_SECRET` | *(vacío)* |
