"use client";

import type { Route } from "next";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendMagicLinkAction } from "../actions/magic-link";
import { getSocialSignInUrlAction } from "../actions/sign-in";
import { signUpEmailAction } from "../actions/sign-up";

export function useSignUp() {
  const router = useRouter();

  const { execute: executeSignUp, isExecuting: isSigningUp, result: signUpResult } = useAction(
    signUpEmailAction,
    {
      onSuccess: () => {
        toast.success(
          "Account aangemaakt! Controleer je e-mail om je account te verifiëren."
        );
        router.push("/sign-in" as Route);
      },
    }
  );

  const { execute: executeSocialSignIn, isExecuting: isSocialSigningIn, result: socialSignInResult } =
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

  const { execute: executeMagicLink, isExecuting: isSendingMagicLink, result: magicLinkResult } =
    useAction(sendMagicLinkAction, {
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
    socialSignInError: socialSignInResult.serverError,
  };
}

