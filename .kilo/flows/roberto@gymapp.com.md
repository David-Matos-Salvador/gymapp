# Flow: Roberto Navarro
- **Email**: roberto@gymapp.com
- **Password**: (valor de SEED_PASSWORD)
- **Role**: MEMBER
- **Dependencies**: dep-3 (trainer2 sends request) MUST be completed before step 4
- **Base URL**: http://localhost:3000

## Steps

### 1. Login
- browser navigate: {baseUrl}/login
- fill email: roberto@gymapp.com
- fill password: (valor de SEED_PASSWORD)
- click "Iniciar sesión"
- expect: redirect to /my-routine (onboarding completed)

### 2. Rutinas Dashboard
- wait for page load
- verify heading "Hola, Roberto"
- verify NO assigned plan (shows "Sin rutina asignada")

### 3. Notifications
- navigate: {baseUrl}/notifications
- After dep-3 completed: verify notification from Coach Andrea

### 4. Check Trainer Requests (REQUIRES dep-3 completed)
- navigate: {baseUrl}/requests
- verify pending request from "Coach Andrea"
- click "Aceptar"

### 5. Payment
- select plan: "Plan Trimestral" ($1200 MXN)
- select payment method: TRANSFER
- upload receipt or click "Subir comprobante"
- verify pending confirmation

### 6. Done (waiting for trainer2 confirmation)
- Status: wait_for_dependency dep-5

### 7. Post-Confirmation
- trainer2 confirms payment → trainer2 assigns routine
- navigate: {baseUrl}/my-routine
- verify plan visible
- start first workout
- complete first set
- Status: completed
