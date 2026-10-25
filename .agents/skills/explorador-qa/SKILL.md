---
name: explorador-qa
description: Explorador de gymapp en QA. Úsala cuando David pida "revisa el buzón", "explora QA", "busca cosas que no cuadren" o en la tarea programada diaria. Lee el Buzón gymapp de Notion (lo que a David no le cuadra, con capturas), recorre https://gym-qa.davidmatos.lat con distintos perfiles buscando errores y fricciones, abre issues, resuelve lo que pueda con la skill mejora-continua y deja la respuesta en el buzón.
---

# Explorador de gymapp (QA)

Dos fuentes de trabajo, en este orden:
1. **El Buzón gymapp de Notion**: lo que David anotó (con capturas).
2. **La exploración propia de QA**: usar la app como distintas personas y anotar lo que no cuadra.

Lo que se pueda resolver pasa por la skill **`mejora-continua`** (triage, rama, PR, CI, QA, merge).
**Solo QA** (`https://gym-qa.davidmatos.lat`). Nunca producción.

## Límites de cada corrida

- Como máximo **2 arreglos** completos (ciclo `mejora-continua`) y **5 issues nuevos**.
- Unos **40 minutos** en total. Si se acaba el tiempo, dejar todo anotado y terminar.
- Si `main` tiene un PR del agente abierto y sin terminar, terminarlo antes de empezar otro.

## 1. Buzón de Notion

Base de datos "Buzón gymapp": https://app.notion.com/p/6e5ebf5aa5ad487783204cf1b64c72a7
(data source `collection://f457cc9f-a57e-4c60-aabe-fe0a46b60e0c`).

Para cada fila con `Estado` = Nuevo **o vacío**, de la más antigua a la más nueva:
1. Lee `Qué no cuadra`, `Detalle`, `Dónde` y mira las `Capturas` (descárgalas para verlas).
2. Reprodúcelo en QA. Si no se reproduce, escríbelo en `Respuesta del agente` y pregunta lo que
   falte (Estado = Necesita tu decisión).
3. Crea el issue en GitHub con la etiqueta `feedback` (texto de David + enlace a la fila de
   Notion; las capturas quedan en Notion). Pon el enlace en `Issue` y Estado = En proceso.
4. Sigue `mejora-continua`. Al terminar, completa `PR`, escribe en `Respuesta del agente` qué se
   hizo en 2 o 3 líneas simples, y Estado = Listo en QA. Si toca preguntar, Estado = Necesita tu
   decisión con la pregunta concreta. Si se descarta, Estado = Descartado con el porqué.

Nunca borres filas ni cambies lo que escribió David.

## 2. Exploración de QA

Usa el navegador disponible (Playwright MCP o el navegador integrado; si no hay, prueba por HTTP).
Recorre con estos perfiles, mirando también la vista móvil (390 px de ancho):

| Perfil | Cómo entrar | Qué recorrer |
|---|---|---|
| Miembro nuevo | Registrarse en `/register?gym=fitness-total` con un correo nuevo `explorador+AAAAMMDDHHmm@example.com` (contraseña de prueba propia) | Registro, onboarding completo, primera rutina, perfil y foto |
| Miembro activo | Usuario demo del seed (`prisma/seed.ts`) | Entrenar, historial, progreso, pagos y comprobante |
| Coach | Usuario demo trainer del seed | Clientes, solicitudes, rutinas, confirmar pagos |
| Admin | Usuario demo admin del seed | Dashboard, planes, membresías, equipamiento |

Busca, en este orden: errores (pantallas en blanco, 500, consola con errores), cosas que bloquean
a una persona (botones deshabilitados sin explicación, pasos sin salida), textos confusos o
mezcla de idiomas, problemas en móvil, lentitud evidente (más de 5 s).

Por cada hallazgo, **antes de abrir un issue revisa que no exista** (`gh issue list --search`).
Issue nuevo con etiqueta `encontrado-por-agente`: qué pasó, pasos para reproducir, perfil, URL
y qué se esperaba. Si es un bug chico y claro, pásalo por `mejora-continua` (cuenta para el
límite de 2 arreglos).

Los usuarios demo cambian con cada corrida; está bien. No resetees QA ni corras el seed sin
avisarlo en el resumen.

## 3. Resumen final

Al terminar, un resumen corto (lo verá David en la app):
- Buzón: cuántas filas revisadas y en qué estado quedaron.
- Exploración: qué perfiles y flujos se recorrieron.
- Issues nuevos y PRs fusionados (con enlaces).
- Lo que necesita su decisión, en una línea cada uno.
