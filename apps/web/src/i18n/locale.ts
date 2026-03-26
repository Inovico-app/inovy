"use server";

import { cookies } from "next/headers";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from "./config";

export async function setLocale(locale: string): Promise<void> {
  const validated = SUPPORTED_LOCALES.includes(locale as Locale)
    ? (locale as Locale)
    : DEFAULT_LOCALE;

  const store = await cookies();
  store.set("locale", validated, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });
}

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get("locale")?.value;
  return SUPPORTED_LOCALES.includes(value as Locale)
    ? (value as Locale)
    : DEFAULT_LOCALE;
}
