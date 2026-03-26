"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  updateMeeting,
  saveMeetingNotes,
  configurePostActions,
} from "../actions/meeting-actions";

export function useMeetingActions() {
  const t = useTranslations("meetings");
  const router = useRouter();

  const { execute: executeUpdateMeeting, isExecuting: isUpdatingMeeting } =
    useAction(updateMeeting, {
      onSuccess: () => {
        toast.success(t("toast.meetingUpdated"));
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error(t("toast.meetingUpdateFailed"), {
          description: error.serverError || t("toast.pleaseTryAgain"),
        });
      },
    });

  const { execute: executeSaveNotes, isExecuting: isSavingNotes } = useAction(
    saveMeetingNotes,
    {
      onSuccess: () => {
        toast.success(t("toast.notesSaved"));
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error(t("toast.notesSaveFailed"), {
          description: error.serverError || t("toast.pleaseTryAgain"),
        });
      },
    },
  );

  const {
    execute: executeConfigurePostActions,
    isExecuting: isConfiguringPostActions,
  } = useAction(configurePostActions, {
    onSuccess: () => {
      toast.success(t("toast.postActionsConfigured"));
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(t("toast.postActionsConfigureFailed"), {
        description: error.serverError || t("toast.pleaseTryAgain"),
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
