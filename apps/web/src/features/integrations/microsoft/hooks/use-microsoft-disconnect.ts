"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { disconnectMicrosoftAccount } from "../actions/disconnect";

export function useMicrosoftDisconnect(onSuccess?: () => void) {
  const { execute, isPending } = useAction(disconnectMicrosoftAccount, {
    onSuccess: () => {
      toast.success("Microsoft account disconnected successfully");
      onSuccess?.();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to disconnect account");
    },
  });

  return { disconnect: execute, isDisconnecting: isPending };
}
