"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateMeeting,
  saveMeetingNotes,
  configurePostActions,
} from "../actions/meeting-actions";

export function useMeetingActions() {
  const router = useRouter();

  const { execute: executeUpdateMeeting, isExecuting: isUpdatingMeeting } =
    useAction(updateMeeting, {
      onSuccess: () => {
        toast.success("Meeting updated");
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error("Failed to update meeting", {
          description: error.serverError || "Please try again",
        });
      },
    });

  const { execute: executeSaveNotes, isExecuting: isSavingNotes } = useAction(
    saveMeetingNotes,
    {
      onSuccess: () => {
        toast.success("Notes saved");
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error("Failed to save notes", {
          description: error.serverError || "Please try again",
        });
      },
    }
  );

  const {
    execute: executeConfigurePostActions,
    isExecuting: isConfiguringPostActions,
  } = useAction(configurePostActions, {
    onSuccess: () => {
      toast.success("Post-meeting actions configured");
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error("Failed to configure post-meeting actions", {
        description: error.serverError || "Please try again",
      });
    },
  });

  return {
    updateMeeting: executeUpdateMeeting,
    isUpdatingMeeting,
    saveNotes: executeSaveNotes,
    isSavingNotes,
    configurePostActions: executeConfigurePostActions,
    isConfiguringPostActions,
  };
}
