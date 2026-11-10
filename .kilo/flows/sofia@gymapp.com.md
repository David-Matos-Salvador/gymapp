# Flow: Sofía Castillo
- **Email**: sofia@gymapp.com
- **Password**: demo123
- **Role**: MEMBER
- **Scenario**: Expired membership, has assigned plan
- **Base URL**: http://localhost:3000

## Steps

### 1. Login
- browser navigate: {baseUrl}/login
- fill email: sofia@gymapp.com
- fill password: demo123
- click "Iniciar sesión"
- expect: redirect to /my-routine (onboarding done, but membership EXPIRED)

### 2. Rutinas Dashboard — Membership Warning
- wait for page load
- verify heading "Hola, Sofía"
- verify warning/error about expired membership
- verify plan "Quema Grasa Metabólico" may show restricted access

### 3. Go to Membresía
- navigate: {baseUrl}/membresia
- verify membership card shows: EXPIRED status
- verify payment form visible to renew

### 4. Renew Membership
- select plan: "Plan Mensual" ($500 MXN)
- select payment method: CASH
- click "Enviar" or submit payment
- verify: payment pending confirmation

### 5. Notifications
- navigate: {baseUrl}/notifications
- verify "Membresía vencida" warning notification

### 6. Done
- Status: completed (membership reactivation pending admin confirmation)
