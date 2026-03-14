"use client";

import type { Route } from "next";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendMagicLinkAction } from "../actions/magic-link";
import { signUpEmailAction } from "../actions/sign-up";
import { useSocialSignIn } from "./use-social-sign-in";

export function useSignUp(redirectUrl?: string) {
  const router = useRouter();
  const { executeSocialSignIn, isSocialSigningIn, socialSignInError } =
    useSocialSignIn("/sign-up");

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
