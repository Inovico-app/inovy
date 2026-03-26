"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  addAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  applyAgendaTemplate,
} from "../actions/agenda-actions";
import { generateAgendaFromAI } from "../actions/generate-agenda";

export function useAgendaActions() {
  const t = useTranslations("meetings");
  const router = useRouter();

  const { execute: executeAddItem, isExecuting: isAddingItem } = useAction(
    addAgendaItem,
    {
      onSuccess: () => {
        toast.success(t("toast.agendaItemAdded"));
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error(t("toast.agendaItemAddFailed"), {
          description: error.serverError || t("toast.pleaseTryAgain"),
        });
      },
    },
  );

  const { execute: executeUpdateItem, isExecuting: isUpdatingItem } = useAction(
    updateAgendaItem,
    {
      onSuccess: () => {
        toast.success(t("toast.agendaItemUpdated"));
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error(t("toast.agendaItemUpdateFailed"), {
          description: error.serverError || t("toast.pleaseTryAgain"),
        });
      },
    },
  );

  const { execute: executeDeleteItem, isExecuting: isDeletingItem } = useAction(
    deleteAgendaItem,
    {
      onSuccess: () => {
        toast.success(t("toast.agendaItemRemoved"));
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error(t("toast.agendaItemRemoveFailed"), {
          description: error.serverError || t("toast.pleaseTryAgain"),
        });
      },
    },
  );

  const { execute: executeApplyTemplate, isExecuting: isApplyingTemplate } =
    useAction(applyAgendaTemplate, {
      onSuccess: () => {
        toast.success(t("toast.templateApplied"));
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error(t("toast.templateApplyFailed"), {
          description: error.serverError || t("toast.pleaseTryAgain"),
        });
      },
    });

  const { execute: executeGenerateAgenda, isExecuting: isGeneratingAgenda } =
    useAction(generateAgendaFromAI, {
      onSuccess: () => {
        toast.success(t("toast.agendaGenerated"));
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error(t("toast.agendaGenerateFailed"), {
          description: error.serverError || t("toast.pleaseTryAgain"),
        });
      },
    });

  return {
    addItem: executeAddItem,
    isAddingItem,
    updateItem: executeUpdateItem,
    isUpdatingItem,
    deleteItem: executeDeleteItem,
    isDeletingItem,
    applyTemplate: executeApplyTemplate,
    isApplyingTemplate,
    generateAgenda: executeGenerateAgenda,
    isGeneratingAgenda,
  };
}
