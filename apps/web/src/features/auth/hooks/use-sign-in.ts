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
        toast.success("Signed in successfully");
      },
      onError: ({ error }) => {
        const errorMessage = error.serverError ?? "Failed to sign in";
        if (errorMessage.includes("verify")) {
          toast.error("Please verify your email address before signing in");
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
        toast.error(error.serverError ?? "Failed to initiate social sign-in");
      },
    });

  const { execute: executeMagicLink, isExecuting: isSendingMagicLink } =
    useAction(sendMagicLinkAction, {
      onSuccess: () => {
        toast.success("Magic link sent! Check your email.");
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Failed to send magic link");
      },
    });

  const { execute: executePasswordReset, isExecuting: isResettingPassword } =
    useAction(requestPasswordResetAction, {
      onSuccess: () => {
        toast.success("Password reset email sent! Check your email.");
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Failed to send password reset email");
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

