"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { sendMagicLinkAction } from "../actions/magic-link";
import { requestPasswordResetAction } from "../actions/password-reset";
import {
  getSocialSignInUrlAction,
  signInEmailAction,
} from "../actions/sign-in";

export function useSignIn() {
  const { execute: executeSignIn, isExecuting: isSigningIn } = useAction(
    signInEmailAction,
    {
      onSuccess: () => {
        toast.success("Succesvol ingelogd");
      },
      onError: ({ error }) => {
        const errorMessage = error.serverError ?? "Inloggen mislukt";
        if (errorMessage.includes("verify")) {
          toast.error("Verifieer eerst je e-mailadres voordat je inlogt");
        } else {
          toast.error(errorMessage);
        }
      },
    }
  );

  const { execute: executeSocialSignIn, isExecuting: isSocialSigningIn } =
    useAction(getSocialSignInUrlAction, {
      onSuccess: ({ data }) => {
        const url = typeof data?.url === "string" ? data.url : undefined;
        if (url) {
          window.location.href = url;
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Social login starten mislukt");
      },
    });

  const { execute: executeMagicLink, isExecuting: isSendingMagicLink } =
    useAction(sendMagicLinkAction, {
      onSuccess: () => {
        toast.success("Magic link verzonden! Controleer je e-mail.");
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Magic link verzenden mislukt");
      },
    });

  const { execute: executePasswordReset, isExecuting: isResettingPassword } =
    useAction(requestPasswordResetAction, {
      onSuccess: () => {
        toast.success("Wachtwoord reset e-mail verzonden! Controleer je e-mail.");
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Wachtwoord reset e-mail verzenden mislukt");
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
  };
}

