# Flow: Ana López
- **Email**: ana@gymapp.com
- **Password**: (valor de SEED_PASSWORD)
- **Role**: MEMBER
- **Base URL**: http://localhost:3000

## Steps

### 1. Login
- browser navigate: {baseUrl}/login
- fill email: ana@gymapp.com
- fill password: (valor de SEED_PASSWORD)
- click "Iniciar sesión"
- expect: redirect to /my-routine

### 2. Rutinas Dashboard
- wait for page load
- verify heading "Hola, Ana" present
- verify plan name: "Quema Grasa Metabólico"
- verify weekly calendar (1 workout completed)
- verify split cards: Circuito A, B, C

### 3. Start Workout — Circuito B
- click on "Circuito B" split card
- verify navigate to /my-routine/[planId]/workout/[splitId]
- click "Iniciar entrenamiento"
- verify exercises: Fondos, Press banca, Elevaciones laterales, Press francés, Plancha
- complete first exercise (Fondos, 4×10-12, bodyweight)
- verify timer works

### 4. Membresía
- navigate: {baseUrl}/membresia
- verify membership card visible: Plan Mensual, ACTIVE
- verify payment confirmed status

### 5. Classes
- navigate: {baseUrl}/classes
- verify classes list (HIIT Intenso, Yoga Vinyasa)
- verify Ana has booking on Yoga Vinyasa

### 6. Notifications
- navigate: {baseUrl}/notifications
- verify "Bienvenida Ana" notification

### 7. Done
- Status: completed
