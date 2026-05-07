Configura la autenticación completa con NextAuth.js (Auth.js v5):

1. Configura el archivo de auth en `src/auth.ts`:
   - NextAuth.js con PrismaAdapter
   - Provider de credenciales (email + password con bcrypt)
   - Provider de Google OAuth
   - JWT strategy con access + refresh tokens
   - Callbacks de sesión (incluir userId, role, membership)

2. Crea el middleware de Next.js para proteger rutas:
```typescript
// src/middleware.ts
export { auth as middleware } from "@/auth"
export const config = { matcher: ["/dashboard/:path*"] }
```

3. Crea las API routes de auth:
   - `POST /api/auth/register` - Crear usuario + hash bcrypt
   - `POST /api/auth/login` - Validar credenciales + JWT
   - `POST /api/auth/refresh` - Refresh token

4. Crea las páginas:
   - `/login` con LoginForm (React Hook Form + Zod)
   - `/register` con RegisterForm (validación email, password strength)
   - Social login buttons (Google)

5. Crea el AuthProvider en `src/providers/AuthProvider.tsx`:
   - SessionProvider de NextAuth.js
   - Hook `useAuth()` para acceder a la sesión en cualquier componente

6. Configura variables de entorno:
   - AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET

7. Verifica el flujo completo:
   - Registro con email nuevo → redirect a dashboard
   - Login con credenciales → redirect a dashboard
   - Login con Google → redirect a dashboard
   - Logout → redirect a landing
   - Ruta privada sin sesión → redirect a login
CMD_EOF
echo 'OK setup-auth.md'