# Flow: Super Admin
- **Email**: superadmin@gymapp.com
- **Password**: (valor de SEED_PASSWORD)
- **Role**: SUPER_ADMIN
- **Base URL**: http://localhost:3000

## Steps

### 1. Login
- browser navigate: {baseUrl}/login
- fill input[name="email"]: superadmin@gymapp.com
- fill input[name="password"]: (valor de SEED_PASSWORD)
- click button "Iniciar sesión"
- expect: redirect to /super-admin

### 2. Super Admin Panel
- wait for page load
- verify heading "Panel de Plataforma" or "Super Admin" present
- verify 6 stat cards visible (Gimnasios, Usuarios, Membresías, Check-ins, Entrenadores, Ingresos)
- click "Crear gym" button (if exists) — verify modal opens
- close modal (Esc or click outside)
- verify users panel shows recent users

### 3. Done
- Status: completed
