# Role Quality Loop

Objetivo: llevar la app a un estándar óptimo **rol por rol**, de forma lineal, con decisiones explícitas y validación después de cada cambio.

## Orden de roles

1. **SUPER_ADMIN** — plataforma, gym base, catálogo global y permisos.
2. **ADMIN** — operación del gym: membresías, pagos, clases, equipamiento, coaches.
3. **TRAINER** — clientes, rutinas, clases, comprobantes.
4. **MEMBER** — onboarding, membresía/pago, rutinas, workouts, clases, progreso, perfil.

El orden va de la base hacia el usuario final: primero se estabiliza la configuración y los permisos, después la operación, luego el coaching y por último la experiencia del socio.

## Loop por rol

1. **Inventario:** rutas, acciones, estados, permisos, datos y casos borde del rol.
2. **Auditoría:** funcional, campos/validaciones, permisos, UX, accesibilidad, responsive, contradicciones y features faltantes.
3. **Juez:** clasifica cada hallazgo y decide:
   - **Bug:** corregir.
   - **Mejora UX:** simplificar/aclarar.
   - **Funcionalidad faltante:** agregar si es necesaria para el estándar del rol.
   - **Diferir:** backlog con motivo.
     Cada decisión incluye severidad, criterio de aceptación y tests.
4. **Fix/Mejora/Feature:** en worktree aislado, con test de regresión. Sin cambios fuera del alcance.
5. **Validación:** suite del rol + regresión completa + a11y/visual. Regenerar informe.
6. **Gate:** si hay bugs críticos/altos o contradicciones, vuelve al juez/fixer. Si está verde, se integra y se pasa al siguiente rol.

No se avanza al rol siguiente hasta cerrar el gate del actual.

## Regla del juez

Para cada hallazgo:

- ¿Es un bug reproducible? → fix.
- ¿Es confuso o inconsistente? → mejora UX.
- ¿Falta una acción que el rol necesita? → feature.
- ¿Es cosmético o no cambia la tarea? → diferir.
- ¿Afecta a otro rol o al modelo de datos? → coordinar antes de fixear.

Máximo 2 iteraciones por hallazgo; si sigue fallando, escala y se documenta.

## Agentes

- **Role Auditor:** read-only; inventario, Playwright, screenshots, a11y, matriz rol × ruta × acción.
- **Juez:** read-only; clasifica y prioriza.
- **Fixer:** implementa solo lo aprobado, con test de regresión.
- **Validator/Orchestrator:** integra, corre suites y actualiza el informe.
- **UX Auditor:** heurísticas, consistencia visual, copy y carga cognitiva.

## Definición de “estándar óptimo” por rol

- Todas las rutas y acciones del rol cubiertas.
- Permisos correctos: 401/403/redirect y botones ocultos/deshabilitados.
- Campos validados en UI y API (min/max, required, formatos, uploads, fechas).
- Estados vacío/loading/error/success claros.
- Sin acciones duplicadas, contradictorias ni features a medio hacer.
- Accesibilidad: headings, labels, foco, teclado, contraste.
- Responsive y dark mode.
- Sin errores 5xx ni console errors críticos.
- Suite del rol + regresión completa en verde.

## Artefactos

```text
docs/roles/<rol>/scope.md
docs/roles/<rol>/audit.md
docs/roles/<rol>/decisions.md
VALIDATION_REPORT.md
```

## Estado actual

- Rama de integración: `fix/validation-batch-1`.
- Validación multi-rol: 60/60.
- `npm run validate`: 207 tests.
- Próximo rol: **SUPER_ADMIN**.
