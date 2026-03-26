import { COOKIE_CONSENT_KEY } from "@/lib/constants/cookie-consent";
import { useCallback, useEffect, useState } from "react";

export function useCookiePreferences() {
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    try {
      const acknowledged = localStorage.getItem(COOKIE_CONSENT_KEY);
      setHasConsented(Boolean(acknowledged));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleResetConsent = useCallback(() => {
    try {
      localStorage.removeItem(COOKIE_CONSENT_KEY);
      setHasConsented(false);
      // Reload to re-trigger the cookie consent banner
      window.location.reload();
    } catch {
      // localStorage unavailable
    }
  }, []);

  return { hasConsented, handleResetConsent };
}
