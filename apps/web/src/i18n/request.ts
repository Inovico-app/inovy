import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./config";

export default getRequestConfig(async () => {
  let locale: Locale = DEFAULT_LOCALE;

  try {
    const store = await cookies();
    const value = store.get("locale")?.value;
    if (SUPPORTED_LOCALES.includes(value as Locale)) {
      locale = value as Locale;
    }
  } catch {
    // cookies() throws during static prerendering — use default locale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
