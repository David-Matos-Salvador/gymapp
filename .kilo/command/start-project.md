Inicializa el proyecto Gym-App desde cero:

1. Crea el proyecto con Next.js 15:
```bash
npx create-next-app@latest gym-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

2. Instala todas las dependencias:
```bash
npm install prisma @prisma/client next-auth@beta @auth/prisma-adapter zod react-hook-form @hookform/resolvers zustand @tanstack/react-query recharts framer-motion stripe @radix-ui/react-* lucide-react sonner
npm install -D @types/node vitest @vitejs/plugin-react playwright @playwright/test eslint-config-prettier prettier
```

3. Inicializa shadcn/ui con los componentes necesarios (button, card, input, dialog, dropdown-menu, sheet, tabs, etc.)

4. Configura Tailwind CSS con la paleta de colores del design system (verde gym, naranja, violeta acento)

5. Crea el schema de Prisma con todos los modelos (User, Routine, Exercise, RoutineExercise, WorkoutLog, Class, Booking, Payment, Notification)

6. Configura NextAuth.js con el PrismaAdapter y el provider de credenciales + Google

7. Crea los archivos Dockerfile y docker-compose.yml según lo especificado por DevOps

8. Inicializa git y crea el .gitignore

9. Verifica que `docker compose up -d` levanta todo correctamente
