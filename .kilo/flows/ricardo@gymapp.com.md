# Flow: Ricardo Medina
- **Email**: ricardo@gymapp.com
- **Password**: demo123
- **Role**: MEMBER
- **Scenario**: Inactive/suspended membership, has assigned plan (coachPlan1)
- **Base URL**: http://localhost:3000

## Steps

### 1. Login
- browser navigate: {baseUrl}/login
- fill email: ricardo@gymapp.com
- fill password: demo123
- click "Iniciar sesión"
- expect: redirect to /rutinas (onboarding done, membership INACTIVE)

### 2. Rutinas Dashboard — Inactive Warning
- wait for page load
- verify heading "Hola, Ricardo"
- verify warning about inactive/suspended membership
- verify plan "Fuerza 5x5 Modificada" may be restricted

### 3. Go to Membresía
- navigate: {baseUrl}/membresia
- verify membership status: INACTIVE or SUSPENDED
- verify no active payment options (account suspended)

### 4. Notifications
- navigate: {baseUrl}/notifications
- verify "Membresía suspendida" warning notification
- verify message: "Cuenta temporalmente inactiva. Contactá al administrador."

### 5. Done
- Status: completed (requires admin intervention to reactivate)
