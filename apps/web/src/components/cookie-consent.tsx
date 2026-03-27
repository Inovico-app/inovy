"use client";

import { Button } from "@/components/ui/button";
import { COOKIE_CONSENT_KEY } from "@/lib/constants/cookie-consent";
import { Cookie } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * Cookie consent banner for ePrivacy Directive compliance.
 * Inovy uses only functional cookies (session, auth tokens) and
 * Vercel Analytics with anonymized geoIP. This banner informs users
 * about cookie usage and links to the privacy policy.
 */
export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const t = useTranslations("cookieConsent");

  useEffect(() => {
    try {
      const acknowledged = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!acknowledged) {
        setIsVisible(true);
      }
    } catch {
      console.warn("[CookieConsent] localStorage read failed");
      setIsVisible(true);
    }
  }, []);

  const handleAcknowledge = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, new Date().toISOString());
    } catch {
      console.warn("[CookieConsent] localStorage write failed");
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-label={t("ariaLabel")}
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t.rich("message", {
              privacyLink: (chunks) => (
                <Link
                  href="/privacy-policy"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
        <Button
          onClick={handleAcknowledge}
          size="sm"
          variant="outline"
          className="shrink-0"
        >
          {t("acknowledge")}
        </Button>
      </div>
    </div>
  );
}
