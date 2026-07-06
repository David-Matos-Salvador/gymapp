# Flow: Laura Gómez
- **Email**: laura@gymapp.com
- **Password**: demo123
- **Role**: MEMBER
- **Scenario**: Fresh signup — no onboarding, no coach, no plan
- **Base URL**: http://localhost:3000

## Steps

### 1. Login + Auto-redirect to Onboarding
- browser navigate: {baseUrl}/login
- fill email: laura@gymapp.com
- fill password: demo123
- click "Iniciar sesión"
- expect: redirect to /dashboard → redirect to /onboarding (onboarding NOT completed)

### 2. Complete Onboarding (9 steps)
- Step 1: select "Pérdida de peso" (WEIGHT_LOSS)
- Step 2: auto-advance
- Step 3: select "Principiante" (BEGINNER)
- Step 4: select "3 días"
- Step 5: skip medical conditions
- Step 6: enter weight 72, height 164
- Step 7: select evening schedule
- Step 8: confirm summary — verify data is correct
- Step 9: browse AI-generated plans — select "Cuerpo Completo Principiante" (double-tap)

### 3. Post-Onboarding
- expect: redirect to /dashboard → /rutinas
- verify heading "Hola, Laura"
- verify plan assigned: "Cuerpo Completo Principiante"

### 4. Start First Workout
- click on first split card (Full Body A)
- click "Iniciar entrenamiento"
- verify exercises loaded
- complete first exercise (Press de banca, 3×10-12)
- verify rest timer works

### 5. Notifications
- navigate: {baseUrl}/notifications
- verify "Te damos la bienvenida Laura" notification

### 6. Done
- Status: completed
