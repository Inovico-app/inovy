"use client";

import { acceptInvitationAction } from "@/features/auth/actions/accept-invitation";
import type { Route } from "next";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Hook for accepting organization invitations
 * Handles the acceptance flow with success/error callbacks
 */
export function useAcceptInvitation() {
  const router = useRouter();

  const { execute: acceptInvitation, isExecuting: isAccepting } = useAction(
    acceptInvitationAction,
    {
      onSuccess: () => {
        toast.success("Uitnodiging geaccepteerd! Je wordt doorgestuurd...");
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/" as Route);
        }, 1500);
      },
      onError: ({ error }) => {
        const errorMessage = error.serverError ?? "Failed to accept invitation";
        toast.error(errorMessage);
      },
    }
  );

  const handleAccept = (invitationId: string) => {
    acceptInvitation({ invitationId });
  };

  return {
    acceptInvitation: handleAccept,
    isAccepting,
  };
}

