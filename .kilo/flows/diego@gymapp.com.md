# Flow: Diego Vargas
- **Email**: diego@gymapp.com
- **Password**: (valor de SEED_PASSWORD)
- **Role**: MEMBER
- **Dependencies**: dep-1 (trainer already assigned plan in seed — completed)
- **Base URL**: http://localhost:3000

## Steps

### 1. Login + Auto-redirect to Onboarding
- browser navigate: {baseUrl}/login
- fill email: diego@gymapp.com
- fill password: (valor de SEED_PASSWORD)
- click "Iniciar sesión"
- expect: redirect to /dashboard → redirect to /onboarding (onboarding NOT completed)

### 2. Complete Onboarding (9 steps)
- Step 1: select objective "Ganancia muscular" (MUSCLE_GAIN)
- Step 2: select training history (auto-advances)
- Step 3: select "Intermedio" (INTERMEDIATE)
- Step 4: select frequency "4 días"
- Step 5: skip medical conditions or select none
- Step 6: enter weight 78, height 178 (verify BMI calculated)
- Step 7: select morning schedule
- Step 8: confirm summary
- Step 9: select plan "Fuerza 5x5 Modificada" (assigned by coach) — this is coachPlan1

### 3. Post-Onboarding Redirect
- expect: redirect to /dashboard → /my-routine
- verify heading "Hola, Diego"
- verify plan assigned: "Fuerza 5x5 Modificada"

### 4. Start Workout — Fuerza A
- click on "Fuerza A" split card
- click "Iniciar entrenamiento"
- verify exercises: Sentadilla (5×5, 105kg), Press banca (5×5, 75kg), Remo barra (5×5, 50kg)
- complete first exercise
- verify rest timer

### 5. Notifications
- navigate: {baseUrl}/notifications
- verify "Coach Martínez te asignó" notification

### 6. Done
- Status: completed
