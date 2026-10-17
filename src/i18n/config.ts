import { createTranslator } from "next-intl";
import en from "./messages/en.json";

export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export type Messages = typeof en;

const catalogs: Record<Locale, Messages> = { en };

export function loadMessages(locale: Locale): Messages {
  return catalogs[locale];
}

/**
 * Translator for code that runs outside a page request (emails, background jobs).
 * Inside components use `useTranslations` / `getTranslations` instead.
 */
export function getServerTranslator(locale: Locale = DEFAULT_LOCALE) {
  return createTranslator({ locale, messages: loadMessages(locale) });
}
