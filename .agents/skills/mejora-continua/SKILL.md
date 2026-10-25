---
name: mejora-continua
description: Ciclo de mejora continua de gymapp. Úsala cuando David diga que algo "no le cuadra", reporte un bug, pida un ajuste de UX o de funcionalidad, o cuando haya issues abiertos con la etiqueta feedback o encontrado-por-agente. Lleva el cambio de punta a punta: triage, rama, cambio con prueba, PR, CI, deploy de la rama a QA, prueba en QA, merge a main, deploy de main a QA y aviso.
---

# Mejora continua de gymapp

David reporta lo que no le cuadra (por chat o como issue). El agente decide, cambia, valida,
despliega en QA, vuelve a probar y fusiona solo si todo está bien. **Producción no la toca
nunca**: solo David publica con un tag `vX.Y.Z`.

## 0. Antes de empezar

- Un ciclo a la vez. Si hay otra rama de trabajo abierta del agente, termínala primero.
- `git checkout main && git pull`. Lee `AGENTS.md` del repo.
- Si el pedido llegó por chat, crea el issue (`gh issue create --label feedback`) con las
  palabras de David, para que quede registro.

## 1. Triage: ¿cambiar, preguntar o descartar?

Decide **solo** (y explica la decisión en el issue) cuando es:
- un bug, un texto confuso, un detalle de UX o de accesibilidad,
- algo chico y reversible que no cambia reglas de negocio.

**Pregunta a David antes** (etiqueta `necesita-decision`, y espera su respuesta) cuando:
- cambia una regla de negocio, precios, permisos o roles,
- toca datos: migraciones que borran, renombran o cambian columnas, o cualquier cosa que pueda
  perder información,
- toca seguridad, autenticación, pagos o secretos,
- el cambio es grande (más de un día de trabajo) o hay varias formas razonables de hacerlo.

**Descarta** con una explicación si ya funciona así a propósito o choca con una decisión
registrada (`infra/docs/decisions/`). Si el pedido es razonable pero no conviene, proponer
una alternativa.

## 2. Cambio

1. Rama: `fix/...`, `feat/...` o `chore/...` desde `main`.
2. El cambio más chico que resuelva el problema, siguiendo el estilo del código.
3. **Una prueba que falle sin el cambio y pase con él** (Vitest para lógica y API; E2E solo si
   el flujo lo necesita). Si no es razonable probarlo, decirlo en el PR.
4. `npm run validate` (formato, lint, tipos, pruebas) y `npm run build`.
5. Commit claro en español (`fix(onboarding): ...`) y PR con: qué pasaba, qué cambia, cómo se
   probó. Referencia al issue (`Closes #N`).

## 3. Validación

1. Esperar el CI del PR (**Quality** y **E2E validation**). Si la E2E falla en algo ajeno al
   cambio, reintentar **una vez** (`gh run rerun <id> --failed`) y, si pasa, abrir un issue del
   caso intermitente.
2. Deploy de la rama a QA: `gh workflow run deploy.yml --ref <rama>`.
3. Esperar a que Coolify termine (API de Coolify con el token de `~/.coolify-token`; nunca
   imprimir el token). Si el build falla por un error pasajero de red, reintentar una vez.
4. **Probar en QA** (`https://gym-qa.davidmatos.lat`) el caso exacto del issue, en el navegador o
   por HTTP, con los usuarios demo del seed (solo en QA; nunca en producción). Mirar también que
   el flujo de alrededor siga funcionando.

## 4. Cierre

- Si todo está bien: `gh pr merge --squash --delete-branch`, deploy de `main` a QA, y repetir la
  prueba en QA.
- Si algo falla: corregir en la misma rama. **Máximo dos intentos**; si no queda bien, detenerse,
  dejar el PR abierto y contarle a David qué pasó.
- Avisar a David en una o dos líneas: qué cambió, cómo se probó, enlace al PR.
- Si el cambio vale la pena para su perfil, ofrecer la entrada para su bitácora
  (skill `bitacora-profesional`).

## Nunca

- Push directo a `main`, tags, o cualquier acción sobre producción.
- Editar o borrar migraciones ya publicadas.
- Resetear o borrar datos de QA sin decirlo antes en el chat.
- Escribir secretos en el código, en issues, en PRs o en el chat.
