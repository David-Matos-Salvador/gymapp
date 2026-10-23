---
description: Auditoría UX completa combinando ui-ux-pro-max, ux-heuristics, impeccable y Playwright
---

# Auditoría UX

Usá esta secuencia para detectar problemas reales de experiencia, no solo estética. No modifiques código hasta terminar el diagnóstico y priorizar.

## 1. `ui-ux-pro-max` — sistema visual

- Revisá jerarquía, tipografía, spacing, color, estados, responsive y consistencia con `globals.css`.
- Aplicá el AI Slop Test y las prohibiciones absolutas.
- Marcá solo desviaciones verificables, no preferencias.

## 2. `ux-heuristics` — usabilidad y flujo

- Aplicá Krug: “Don’t Make Me Think”, Trunk Test, claridad de CTAs y copy.
- Aplicá las 10 heurísticas de Nielsen.
- Hacé cognitive walkthrough del flujo completo: entrada, acción principal, error, salida.
- Asigná severidad 0–4 y un score /10 según la skill.
- Buscá controles escondidos, acciones duplicadas, flujos sin salida y estados ambiguos.

## 3. `impeccable` — calidad técnica

- Corré `npx impeccable detect` sobre los archivos o la URL.
- Revisá a11y, foco, contraste, touch targets, reduced motion, performance y responsive.
- Si existen `PRODUCT.md`/`DESIGN.md`, usalos; si no, declaralo y usá las convenciones del repo.

## 4. Playwright — validación real

- Mobile 390×844, tablet 768 y desktop 1440.
- Back, forward, refresh, cerrar pestaña, cambiar de app y volver.
- Estados: vacío, loading, error, éxito, pausa, descarte y reintento.
- Verificá que UI y API guarden el mismo estado.
- Capturá screenshots de cada hallazgo.

## Salida

Tabla obligatoria:

`ID | Severidad P0-P3 | Tipo | Evidencia archivo:línea o screenshot | Impacto | Criterio de aceptación | Test propuesto`

Reglas:

- Mínimo 10 hallazgos priorizados por impacto.
- Separar bug real de preferencia visual.
- No proponer rediseño sin evidencia.
- Incluir score UX /10 y los 3 fixes de mayor impacto.
- Si algo no se puede verificar, decirlo explícitamente.
