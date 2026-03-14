"use client";

import { authClient } from "@/lib/auth-client";
import type { Route } from "next";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { sendMagicLinkAction } from "../actions/magic-link";
import { signUpEmailAction } from "../actions/sign-up";

export function useSignUp(redirectUrl?: string) {
  const router = useRouter();
  const [isSocialSigningIn, setIsSocialSigningIn] = useState(false);
  const [socialSignInError, setSocialSignInError] = useState<
    string | undefined
  >();

  const {
    execute: executeSignUp,
    isExecuting: isSigningUp,
    result: signUpResult,
  } = useAction(signUpEmailAction, {
    onSuccess: () => {
      toast.success(
        "Account aangemaakt! Controleer je e-mail om je account te verifiëren.",
      );
      const target = redirectUrl
        ? `/sign-in?redirect=${encodeURIComponent(redirectUrl)}`
        : "/sign-in";
      router.push(target as Route);
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
        errorCallbackURL: "/sign-up",
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

  const isLoading = isSigningUp || isSocialSigningIn || isSendingMagicLink;

  return {
    signUpEmail: executeSignUp,
    signUpSocial: executeSocialSignIn,
    sendMagicLink: executeMagicLink,
    isLoading,
    isSigningUp,
    isSocialSigningIn,
    isSendingMagicLink,
    signUpError: signUpResult.serverError,
    magicLinkError: magicLinkResult.serverError,
    socialSignInError,
  };
}
