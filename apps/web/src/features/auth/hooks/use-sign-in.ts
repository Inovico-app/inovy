"use client";

import { authClient } from "@/lib/auth-client";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { sendMagicLinkAction } from "../actions/magic-link";
import { requestPasswordResetAction } from "../actions/password-reset";
import { signInEmailAction } from "../actions/sign-in";

export function useSignIn() {
  const [isSocialSigningIn, setIsSocialSigningIn] = useState(false);
  const [socialSignInError, setSocialSignInError] = useState<
    string | undefined
  >();

  const {
    execute: executeSignIn,
    isExecuting: isSigningIn,
    result: signInResult,
  } = useAction(signInEmailAction, {
    onSuccess: () => {
      toast.success("Succesvol ingelogd");
    },
    onError: ({ error }) => {
      const errorMessage = error.serverError ?? "Inloggen mislukt";
      if (errorMessage.includes("verify")) {
        toast.error("Verifieer eerst je e-mailadres voordat je inlogt");
      }
      // Validation errors are handled by the form UI
    },
  });

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
        errorCallbackURL: "/sign-in",
      });
      if (error) {
        const message = error.message ?? "Social login starten mislukt";
        toast.error(message);
        setSocialSignInError(message);
        setIsSocialSigningIn(false);
      }
    },
    [],
  );

  const {
    execute: executeMagicLink,
    isExecuting: isSendingMagicLink,
    result: magicLinkResult,
  } = useAction(sendMagicLinkAction, {
    onSuccess: () => {
      toast.success("Magic link verzonden! Controleer je e-mail.");
    },
  });

  const {
    execute: executePasswordReset,
    isExecuting: isResettingPassword,
    result: passwordResetResult,
  } = useAction(requestPasswordResetAction, {
    onSuccess: () => {
      toast.success("Wachtwoord reset e-mail verzonden! Controleer je e-mail.");
    },
  });

  const isLoading =
    isSigningIn ||
    isSocialSigningIn ||
    isSendingMagicLink ||
    isResettingPassword;

  return {
    signInEmail: executeSignIn,
    signInSocial: executeSocialSignIn,
    sendMagicLink: executeMagicLink,
    requestPasswordReset: executePasswordReset,
    isLoading,
    isSigningIn,
    isSocialSigningIn,
    isSendingMagicLink,
    isResettingPassword,
    signInError: signInResult.serverError,
    magicLinkError: magicLinkResult.serverError,
    passwordResetError: passwordResetResult.serverError,
    socialSignInError,
  };
}
