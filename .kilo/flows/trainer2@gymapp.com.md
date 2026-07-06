# Flow: Coach Andrea
- **Email**: trainer2@gymapp.com
- **Password**: demo123
- **Role**: TRAINER
- **Base URL**: http://localhost:3001

## Steps

### 1. Login
- browser navigate: {baseUrl}/login
- fill email: trainer2@gymapp.com
- fill password: demo123
- click "Iniciar sesión"
- expect: redirect to /coach

### 2. Coach Dashboard
- wait for page load
- verify stats show 0 clients
- verify routines: 0 (trainer2 has no plans in seed)

### 3. Client List — Empty State
- navigate: {baseUrl}/coach/clients
- verify empty state: "No tienes clientes asignados"

### 4. Create Routines
- navigate: {baseUrl}/routines/new
- create routine: name "Funcional Básico", description "Rutina funcional para nuevos clientes", difficulty INTERMEDIATE
- add 3 exercises (search and add: sentadilla, plancha, burpees)
- set sets/reps: 3x12 for each
- click save
- expect: redirect to /routines, new routine visible in list

### 5. Send Request to Valentina
- DEPENDENCY: this step is critical — sets dep-2 in coordination state
- The seed already has a pending trainerRequest from trainer2→valentina
- Verify by navigating to coach dashboard and checking for pending requests
- If not visible, send new request:
  - Search for member email "valentina@gymapp.com" in member list
  - Click "Enviar solicitud" or "Agregar cliente" on valentina
  - Confirm

### 6. Send Request to Roberto
- Same as step 5 but for "roberto@gymapp.com"
- This sets dep-3 in coordination state

### 7. Done
- Status: wait_for_dependencies (dep-4, dep-5 — valentina and roberto accept)
