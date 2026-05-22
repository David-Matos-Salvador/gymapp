// TODO: Multi-idioma PT-BR
// Integrar next-intl para soportar portugués (Brasil)
// Labels actualmente son traducibles en componentes
export const defaultLocale = "es"
export const locales = ["es", "pt-BR"] as const
export type Locale = (typeof locales)[number]
