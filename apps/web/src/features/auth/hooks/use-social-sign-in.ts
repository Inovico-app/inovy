"use client";

import { authClient } from "@/lib/auth-client";
import { isSafari } from "@/lib/browser-utils";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useSocialSignIn(errorCallbackURL: string) {
  const [isSocialSigningIn, setIsSocialSigningIn] = useState(false);
  const [socialSignInError, setSocialSignInError] = useState<
    string | undefined
  >();

  const executeSocialSignIn = useCallback(
    async (input: {
      provider: "google" | "microsoft";
      callbackUrl?: string;
    }) => {
      setIsSocialSigningIn(true);
      setSocialSignInError(undefined);

      if (isSafari()) {
        // Safari does not reliably persist cookies from fetch() responses.
        // The OAuth state cookie (CSRF protection) would be lost, causing
        // the callback to fail. Use a full page navigation instead so the
        // state cookie is set in a navigation response.
        const params = new URLSearchParams({
          provider: input.provider,
          callbackURL: input.callbackUrl || "/",
          errorCallbackURL,
        });
        window.location.href = `/api/auth/social-redirect?${params.toString()}`;
        return;
      }

      const { error } = await authClient.signIn.social({
        provider: input.provider,
        callbackURL: input.callbackUrl || "/",
        errorCallbackURL,
      });
      if (error) {
        const message = error.message ?? "Social login starten mislukt";
        toast.error(message);
        setSocialSignInError(message);
        setIsSocialSigningIn(false);
      }
    },
    [errorCallbackURL],
  );

  return {
    executeSocialSignIn,
    isSocialSigningIn,
    socialSignInError,
  };
}
