# Flow: Pedro Sánchez
- **Email**: pedro@gymapp.com
- **Password**: demo123
- **Role**: MEMBER
- **Base URL**: http://localhost:3001

## Steps

### 1. Login
- browser navigate: {baseUrl}/login
- fill email: pedro@gymapp.com
- fill password: demo123
- click "Iniciar sesión"
- expect: redirect to /rutinas

### 2. Rutinas Dashboard
- wait for page load
- verify heading "Hola, Pedro" present
- verify plan name: "Fuerza 5x5 Modificada" (assigned by coach)
- verify weekly calendar shows past workouts
- verify split cards: Fuerza A, Fuerza B, Fuerza C

### 3. Start Workout — Fuerza B
- click on "Fuerza B" split card
- click "Iniciar entrenamiento"
- verify exercises:
  - Peso muerto (5×5, 120kg)
  - Press militar (5×5, 50kg)
  - Dominadas (3×8, bodyweight)
- complete first set of Peso muerto
- verify rest timer

### 4. Profile
- navigate: {baseUrl}/profile
- verify: Pedro Sánchez, ADVANCED, STRENGTH objective
- verify: 185cm, 95kg

### 5. Done
- Status: completed
