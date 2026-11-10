# Flow: Carlos Rodríguez
- **Email**: carlos@gymapp.com
- **Password**: demo123
- **Role**: MEMBER
- **Base URL**: http://localhost:3000

## Steps

### 1. Login
- browser navigate: {baseUrl}/login
- fill email: carlos@gymapp.com
- fill password: demo123
- click "Iniciar sesión"
- expect: redirect to /my-routine (onboarding completed, active plan)

### 2. Rutinas Dashboard
- wait for page load
- verify heading "Hola, Carlos" present
- verify plan name: "Hipertrofia Push-Pull-Legs"
- verify weekly calendar visible (3 workouts this week)
- verify streak badge visible (7-day streak)
- verify split cards visible (Push A, Pull B, Legs C)

### 3. Start Workout — Push (Split A)
- click on "Push (Empuje)" split card
- verify navigate to /my-routine/[planId]/workout/[splitId]
- verify prepare phase: exercise count (6), estimated time (~65min)
- click "Iniciar entrenamiento"
- verify warmup/active phase with exercises list
- scroll through all 6 exercises:
  - Press de banca (4 sets × 6-8 reps, 70kg)
  - Press inclinado mancuernas (3 × 8-10, 24)
  - Press militar (4 × 6-8, 45)
  - Elevaciones laterales (3 × 12-15, 10)
  - Press francés (3 × 10-12, 22.5)
  - Extensión polea (3 × 12-15, 18)
- mark first set of Press de banca as complete
- verify timer starts for rest period
- complete a few more sets (don't need to finish all — just verify flow works)

### 4. Notifications
- navigate: {baseUrl}/notifications
- verify notification list visible
- verify notification "¡Bienvenido a Fitness Total!" present
- click "Marcar todas leídas"

### 5. Profile
- navigate: {baseUrl}/profile
- verify profile info: name, email, phone, sex (MALE)
- verify objective: Ganancia muscular, experience: Intermedio

### 6. Progress
- navigate: {baseUrl}/progress
- verify weight evolution chart (Recharts)
- verify measurements table with 4 entries
- verify metrics: weight, body fat, muscle mass show progression

### 7. Done
- Status: completed
