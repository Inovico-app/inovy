import { COOKIE_CONSENT_KEY } from "@/lib/constants/cookie-consent";
import { useEffect, useState } from "react";

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

  function handleResetConsent() {
    try {
      localStorage.removeItem(COOKIE_CONSENT_KEY);
      setHasConsented(false);
      window.location.reload();
    } catch {
      // localStorage unavailable
    }
  }

  return { hasConsented, handleResetConsent };
}
