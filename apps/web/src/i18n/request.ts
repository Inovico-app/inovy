import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

/**
 * next-intl request configuration.
 * Uses cookie-based locale detection without URL prefixes.
 * Default: Dutch (nl) for Dutch government/business target market.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = store.get("locale")?.value ?? "nl";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
