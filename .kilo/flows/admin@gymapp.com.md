# Flow: Admin
- **Email**: admin@gymapp.com
- **Password**: demo123
- **Role**: ADMIN
- **Base URL**: http://localhost:3001

## Steps

### 1. Login
- browser navigate: {baseUrl}/login
- fill email: admin@gymapp.com
- fill password: demo123
- click "Iniciar sesión"
- expect: redirect to /admin

### 2. Admin Dashboard
- wait for page load
- verify heading "Admin" present
- verify stat cards: membresías activas, ingresos, nuevos miembros, asistencia
- verify expiring memberships section visible
- verify recent check-ins list

### 3. Memberships
- navigate: {baseUrl}/admin/memberships
- verify heading "Membresías" present
- verify membership table with records (carlos, ana, pedro, mateo, diego, sofia, ricardo)

### 4. Gym Management
- navigate: {baseUrl}/admin/gym-management
- verify 3 tabs: Exercises, Routine Plans, Members
- click "Routine Plans" tab → verify plans visible
- click "Exercises" tab → verify 25 exercises visible
- click "Members" tab → verify member list

### 5. Done
- Status: completed
