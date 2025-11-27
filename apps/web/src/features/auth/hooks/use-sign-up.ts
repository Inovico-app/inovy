"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { toast } from "sonner";
import {
  signUpEmailAction,
  getSocialSignInUrlAction,
  sendMagicLinkAction,
} from "../actions";

export function useSignUp() {
  const router = useRouter();

  const { execute: executeSignUp, isExecuting: isSigningUp } = useAction(
    signUpEmailAction,
    {
      onSuccess: () => {
        toast.success(
          "Account created! Please check your email to verify your account."
        );
        router.push("/sign-in" as Route);
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to create account");
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
        toast.error(error.serverError || "Failed to send magic link");
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
  };
}

