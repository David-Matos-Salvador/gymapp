# Flow: Valentina Ríos
- **Email**: valentina@gymapp.com
- **Password**: demo123
- **Role**: MEMBER
- **Dependencies**: dep-2 (trainer2 sends request) MUST be completed before step 4
- **Base URL**: http://localhost:3000

## Steps

### 1. Login
- browser navigate: {baseUrl}/login
- fill email: valentina@gymapp.com
- fill password: demo123
- click "Iniciar sesión"
- expect: redirect to /rutinas (onboarding completed)

### 2. Rutinas Dashboard
- wait for page load
- verify heading "Hola, Valentina"
- verify NO assigned plan (shows "Sin rutina asignada")

### 3. Notifications
- navigate: {baseUrl}/notifications
- verify notification: "Perfil completado" (from seed)
- After dep-2 completed: verify notification "Solicitud de entrenador" from Coach Andrea

### 4. Check Trainer Requests (REQUIRES dep-2 completed)
- navigate: {baseUrl}/requests
- verify pending request from "Coach Andrea"
- verify coach info: name, email, specialties (REHABILITATION, FUNCTIONAL, STRENGTH)
- click "Aceptar"

### 5. Payment After Accept
- after accepting, payment section appears
- select plan: "Plan Mensual" ($500 MXN)
- select payment method: YAPE
- upload receipt (if dialog shows) or click "Subir comprobante"
- verify: "Membresía pendiente de confirmación"

### 6. Done (waiting for trainer2 confirmation)
- Status: wait_for_dependency dep-4 completion by trainer2

### 7. Post-Confirmation (after trainer2 confirms payment + assigns plan)
- verify notification: "Coach Andrea te ha asignado una rutina"
- navigate: {baseUrl}/rutinas
- verify plan visible
- start first workout
- complete first set
- Status: completed
