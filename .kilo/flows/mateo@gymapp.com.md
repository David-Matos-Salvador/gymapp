# Flow: Mateo Herrera
- **Email**: mateo@gymapp.com
- **Password**: demo123
- **Role**: MEMBER
- **Base URL**: http://localhost:3000

## Steps

### 1. Login
- browser navigate: {baseUrl}/login
- fill email: mateo@gymapp.com
- fill password: demo123
- click "Iniciar sesión"
- expect: redirect to /rutinas (onboarding done, plan assigned, active membership)

### 2. Rutinas Dashboard
- wait for page load
- verify heading "Hola, Mateo" present
- verify plan name: "Cuerpo Completo Principiante"
- verify 0 workouts completed this week
- verify split cards: Full Body A, Full Body B, Full Body C

### 3. First Workout — Full Body A
- click on "Full Body A" split card
- click "Iniciar entrenamiento"
- verify exercises:
  - Press de banca (3×10-12, 30kg)
  - Sentadilla (3×10-12, 30kg)
  - Remo con barra (3×10-12, 25kg)
  - Press militar (3×10-12, 20kg)
  - Plancha (3×30s)
- complete ALL sets for ALL exercises — this is his first workout!
- verify "Entrenamiento completado" celebration screen

### 4. Membresía
- navigate: {baseUrl}/membresia
- verify membership card: Plan Mensual, ACTIVE
- verify payment status (payment was confirmed by coach in Batch 1)

### 5. Done
- Status: completed
