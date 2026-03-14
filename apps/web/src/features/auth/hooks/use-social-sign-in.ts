"use client";

import { authClient } from "@/lib/auth-client";
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
