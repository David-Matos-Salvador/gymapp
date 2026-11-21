# Flow: Coach Martínez
- **Email**: trainer@gymapp.com
- **Password**: (valor de SEED_PASSWORD)
- **Role**: TRAINER
- **Base URL**: http://localhost:3000

## Steps

### 1. Login
- browser navigate: {baseUrl}/login
- fill email: trainer@gymapp.com
- fill password: (valor de SEED_PASSWORD)
- click "Iniciar sesión"
- expect: redirect to /coach

### 2. Coach Dashboard
- wait for page load
- verify heading "Coach" present
- verify stats: total 6 clients (Carlos, Ana, Pedro, Diego, Sofia, Ricardo)
- verify routines count, classes count

### 3. Client List
- navigate: {baseUrl}/coach/clients
- verify 6 client cards visible
- verify: Carlos Rodríguez, Ana López, Pedro Sánchez, Diego Vargas, Sofía Castillo, Ricardo Medina

### 4. Client Detail — Carlos
- click on "Carlos Rodríguez" card
- verify profile info: name, email, phone, objective (MUSCLE_GAIN), experience (INTERMEDIATE)
- verify measurements table (4 entries)
- verify routine panel shows PPL plan
- verify recent workouts list

### 5. Client Detail — Ana
- navigate back or go to {baseUrl}/coach/clients and click Ana
- verify profile: weight loss, beginner
- verify routine panel shows Quema Grasa

### 6. Payments
- navigate: {baseUrl}/coach/payments
- verify pending payments list (mateo should have pending Yape payment)
- click "Ver comprobante" on mateo's payment
- verify receipt/image visible
- click "Confirmar pago"
- expect: success toast, payment moves to confirmed

### 7. Assign Plan to Diego
- navigate: {baseUrl}/coach/clients → Diego → "Asignar rutina"
- select a plan (already assigned via seed, verify it shows)
- verify assigned plan visible

### 8. Create a Routine
- navigate: {baseUrl}/routines/new
- verify form loads (name, description, exercises search)
- don't actually create — just verify page loads

### 9. Done
- Status: completed
