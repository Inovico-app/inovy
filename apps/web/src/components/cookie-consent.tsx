"use client";

import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "cookie-consent-acknowledged";

/**
 * Cookie consent banner for ePrivacy Directive compliance.
 * Inovy uses only functional cookies (session, auth tokens) and
 * Vercel Analytics with anonymized geoIP. This banner informs users
 * about cookie usage and links to the privacy policy.
 */
export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const acknowledged = localStorage.getItem(CONSENT_KEY);
    if (!acknowledged) {
      setIsVisible(true);
    }
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            We use only essential cookies required for the application to
            function (session management and authentication). No tracking or
            marketing cookies are used. See our{" "}
            <Link
              href="/privacy-policy"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
        <Button
          onClick={handleAcknowledge}
          size="sm"
          variant="outline"
          className="shrink-0"
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
