## 1. Modelo y seed

- [x] 1.1 Agregar `Gym.isDefault Boolean @default(false)` en `prisma/schema.prisma`.
- [x] 1.2 Agregar helper `getEffectiveGymId`/`getEffectiveGym` para gym del usuario o default.
- [x] 1.3 Seed idempotente del gym `gymapp-default` (`isDefault=true`, sin local) con ejercicios y equipos activos.
- [x] 1.4 Excluir `isDefault` de listados de selección, invitaciones y planes.
- [x] 1.5 Ejecutar `npm run db:reset` y verificar un único default.

## 2. Registro y onboarding

- [x] 2.1 `POST /api/auth/register`: `gymSlug` opcional; sin slug crea `gymId=null`; con slug válido asigna.
- [x] 2.2 `GET /api/gyms/search`: gyms activos no-default por nombre/slug, autenticado.
- [x] 2.3 `POST /api/user/gym`: vincular gym activo no-default solo si el usuario no tiene uno.
- [x] 2.4 Gate de onboarding “¿Tenés un gimnasio?” con búsqueda, selección y opción “No”.
- [x] 2.5 Omitir el gate si el usuario ya tiene gym por invitación o link.
- [ ] 2.6 Tests de registro sin/con slug, búsqueda, vinculación y gate.

## 3. Catálogo y equipamiento

- [x] 3.1 Resolver equipamiento por ítem: gym del usuario → default → genérico.
- [x] 3.2 Resolver `showMachineNumbers` desde el gym que aportó la configuración.
- [x] 3.3 Resolver ejercicios por `GymExercise` del gym del usuario → default.
- [x] 3.4 Adaptar endpoints de rutina/entrenamiento y UI para usuarios con `gymId=null`.
- [x] 3.5 Bloquear membresías, planes, clases, reservas e invitaciones en el default.
- [ ] 3.6 Empty states/CTA para vincular gym en membresía y clases.

## 4. Coach global

- [ ] 4.1 Permitir búsqueda trainer→miembro y solicitud cuando el miembro tiene `gymId=null`.
- [ ] 4.2 Mantener same-gym cuando el miembro tiene gym.
- [ ] 4.3 Aceptar solicitud de coach sin cambiar `gymId`.
- [ ] 4.4 Tests cross-gym y miembro sin gym.

## 5. Pruebas y validación

- [ ] 5.1 Tests unitarios de fallback de equipamiento/números/ejercicios.
- [ ] 5.2 Tests de operaciones rechazadas en el default.
- [ ] 5.3 E2E: cuenta sin gym → onboarding “No” → rutina/equipamiento con default.
- [ ] 5.4 E2E: onboarding “Sí” → buscar y vincular gym real.
- [ ] 5.5 E2E: invitación omite la pregunta y conserva el gym.
- [x] 4.6 `npm run validate` y `npm run test:validation`; actualizar reporte.

## 6. Documentación

- [x] 5.1 Actualizar `docs/decisions/validation-fixes.md` o crear decisión del default.
- [ ] 6.2 Actualizar `VALIDATION_REPORT.md` y contadores.
- [ ] 6.3 Documentar el flujo en `ARCHITECTURE.md`.
