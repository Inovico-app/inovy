export const SUPPORTED_LOCALES = ["nl", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "nl";
