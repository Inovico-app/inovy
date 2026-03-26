import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./config";

const NAMESPACES = [
  "common",
  "nav",
  "sidebar",
  "mobileSidebar",
  "headerAuth",
  "adminNav",
  "settingsNav",
  "settingsSidebar",
  "adminSidebar",
  "roles",
  "theme",
  "orgSwitcher",
  "cookieConsent",
  "errors",
  "agentDisabled",
  "dashboard",
  "recordings",
  "meetings",
  "settings",
  "auth",
  "onboarding",
  "projects",
  "tasks",
  "chat",
  "teams",
  "notifications",
  "admin",
] as const;

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

  const modules = await Promise.all(
    NAMESPACES.map((ns) => import(`../../messages/${locale}/${ns}.json`)),
  );

  const messages: Record<string, unknown> = {};
  for (let i = 0; i < NAMESPACES.length; i++) {
    messages[NAMESPACES[i]] = modules[i].default;
  }

  return { locale, messages };
});
