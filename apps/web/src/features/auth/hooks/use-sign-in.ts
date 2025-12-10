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

  const {
    execute: executeSocialSignIn,
    isExecuting: isSocialSigningIn,
    result: socialSignInResult,
  } = useAction(getSocialSignInUrlAction, {
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
    socialSignInError: socialSignInResult.serverError,
  };
}

