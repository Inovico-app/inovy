"use client";

import { isSafari } from "@/lib/browser-utils";
import type { Route } from "next";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendMagicLinkAction } from "../actions/magic-link";
import { requestPasswordResetAction } from "../actions/password-reset";
import { signInEmailAction } from "../actions/sign-in";
import { useSocialSignIn } from "./use-social-sign-in";

export function useSignIn() {
  const router = useRouter();
  const { executeSocialSignIn, isSocialSigningIn, socialSignInError } =
    useSocialSignIn("/sign-in");

  const {
    execute: executeSignIn,
    isExecuting: isSigningIn,
    result: signInResult,
  } = useAction(signInEmailAction, {
    onSuccess: ({ data }) => {
      toast.success("Succesvol ingelogd");
      const target = data?.redirectTo ?? "/";
      if (isSafari()) {
        // iOS/macOS Safari does not reliably persist cookies from server
        // action fetch() responses before a soft navigation. Force a full
        // page load so the browser includes the freshly-set session cookie.
        window.location.href = target;
      } else {
        router.push(target as Route);
      }
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
