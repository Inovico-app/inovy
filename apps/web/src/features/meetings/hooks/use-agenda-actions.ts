"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  applyAgendaTemplate,
} from "../actions/agenda-actions";
import { generateAgendaFromAI } from "../actions/generate-agenda";

export function useAgendaActions() {
  const router = useRouter();

  const { execute: executeAddItem, isExecuting: isAddingItem } = useAction(
    addAgendaItem,
    {
      onSuccess: () => {
        toast.success("Agenda item added");
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error("Failed to add agenda item", {
          description: error.serverError || "Please try again",
        });
      },
    }
  );

  const { execute: executeUpdateItem, isExecuting: isUpdatingItem } =
    useAction(updateAgendaItem, {
      onSuccess: () => {
        toast.success("Agenda item updated");
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error("Failed to update agenda item", {
          description: error.serverError || "Please try again",
        });
      },
    });

  const { execute: executeDeleteItem, isExecuting: isDeletingItem } =
    useAction(deleteAgendaItem, {
      onSuccess: () => {
        toast.success("Agenda item removed");
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error("Failed to remove agenda item", {
          description: error.serverError || "Please try again",
        });
      },
    });

  const { execute: executeApplyTemplate, isExecuting: isApplyingTemplate } =
    useAction(applyAgendaTemplate, {
      onSuccess: () => {
        toast.success("Template applied");
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error("Failed to apply template", {
          description: error.serverError || "Please try again",
        });
      },
    });

  const { execute: executeGenerateAgenda, isExecuting: isGeneratingAgenda } =
    useAction(generateAgendaFromAI, {
      onSuccess: () => {
        toast.success("Agenda generated from AI");
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error("Failed to generate agenda", {
          description: error.serverError || "Please try again",
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
