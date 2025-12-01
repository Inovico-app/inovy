"use client";

import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { passkeySignInSuccessAction } from "../actions/sign-in";

export function usePasskeySignIn() {
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

  const { execute: executePasskeySuccess, isExecuting: isPasskeyRedirecting } =
    useAction(passkeySignInSuccessAction, {
      onSuccess: () => {
        // Redirect is handled by the server action
        toast.success("Signed in successfully with passkey");
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError ?? "Failed to complete passkey authentication"
        );
      },
    });

  const signInPasskey = async () => {
    setIsPasskeyLoading(true);
    try {
      // Client-side passkey authentication using Better Auth
      const result = await authClient.signIn.passkey({
        fetchOptions: {
          onSuccess: async () => {
            // Call server action to handle redirect after successful authentication
            executePasskeySuccess({});
          },
          onError: (context) => {
            const errorMessage =
              context.error.message ?? "Failed to sign in with passkey";
            toast.error(errorMessage);
            setIsPasskeyLoading(false);
          },
        },
      });

      // Handle case where no callback was triggered
      if (result.error) {
        toast.error(result.error.message ?? "Failed to sign in with passkey");
        setIsPasskeyLoading(false);
      }
    } catch (error) {
      toast.error("An unexpected error occurred during passkey sign-in");
      logger.error("Passkey sign-in error", {
        error,
        component: "usePasskeySignIn",
        action: "signInPasskey",
      });
      setIsPasskeyLoading(false);
    }
  };

  const isLoading = isPasskeyLoading || isPasskeyRedirecting;

  return {
    signInPasskey,
    isLoading,
    isPasskeyLoading,
    isPasskeyRedirecting,
  };
}

