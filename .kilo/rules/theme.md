# Theme Rule — Single Source of Truth

## Único tema del proyecto

Este proyecto tiene **un solo sistema de tema**. No se permite introducir temas alternativos, duplicados, ni sistemas de estilos paralelos.

## Source of truth

El archivo **`src/app/globals.css`** es la única fuente de verdad para tokens de diseño y variables CSS del tema. Cualquier cambio de color, tipografía, bordes, radios, sombras o spacing debe hacerse exclusivamente en ese archivo.

## Stack unificado

| Capa | Tecnología |
|---|---|
| CSS framework | Tailwind CSS v4 (CSS-based config, sin `tailwind.config.ts`) |
| Design tokens | CSS custom properties en `:root` (light) y `.dark` (dark) |
| Component library | shadcn/ui v4 |
| Theme switching | `ThemeProvider` en `src/components/theme-provider.tsx` |
| Persistencia | Zustand store en `src/stores/settings-store.ts` (key: `gym-settings`) |

## Prohibido

- Crear `tailwind.config.ts` o `tailwind.config.js` — Tailwind v4 usa configuración CSS
- Agregar otro sistema de temas (MUI, styled-components, Emotion, CSS modules con temas)
- Definir variables de color/tema en otros archivos CSS
- Crear archivos `.css` adicionales con definiciones de tema
- Usar colores hardcodeados que no vengan de los tokens del tema (`bg-[#FFD700]` en vez de `bg-primary`)
- Crear un segundo `ThemeProvider` o sistema de toggle de tema

## Excepciones permitidas

- `src/constants/workout.ts` → `PHASE_COLORS` usa clases Tailwind que referencian el tema (ej: `dark:bg-amber-950`)
- Componentes `src/components/ui/*.tsx` → deben usar tokens del tema via Tailwind utilities (`bg-primary`, `text-foreground`, etc.)

## Cómo agregar un nuevo token

1. Agregar la variable CSS en `:root` (light) y `.dark` (dark) en `src/app/globals.css`
2. Mapearla en el bloque `@theme inline` si se necesita como utilidad Tailwind
3. Usarla en componentes como clase Tailwind

## Verificación

Antes de cualquier commit que toque estilos, confirmar que:
- No se crearon nuevos archivos `.css` con variables de tema
- Los colores usados vienen de tokens del tema (no hardcodeados)
- El tema funciona correctamente en light y dark mode
