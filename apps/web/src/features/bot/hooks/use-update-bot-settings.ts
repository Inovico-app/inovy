"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { updateBotSettings } from "../actions/update-bot-settings";

interface UseUpdateBotSettingsOptions {
  onUpdate?: () => void;
}

/**
 * Hook for updating bot settings with automatic success/error handling
 */
export function useUpdateBotSettings(options?: UseUpdateBotSettingsOptions) {
  const { execute, isExecuting } = useAction(updateBotSettings, {
    onSuccess: ({ data }) => {
      if (data) {
        const enabled = data.botEnabled;
        toast.success(
          enabled ? "Bot enabled successfully" : "Bot disabled successfully",
          {
            description: enabled
              ? "The bot will now join your meetings automatically"
              : "The bot will no longer join your meetings",
          }
        );
        options?.onUpdate?.();
      }
    },
    onError: ({ error }) => {
      toast.error("Failed to update bot settings", {
        description: error.serverError || "Please try again",
      });
    },
  });

  return {
    updateBotSettings: execute,
    isUpdating: isExecuting,
  };
}

