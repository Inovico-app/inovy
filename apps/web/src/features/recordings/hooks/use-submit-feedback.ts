"use client";

import { submitFeedbackAction } from "@/features/recordings/actions/submit-feedback";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function useSubmitFeedback() {
  const t = useTranslations("recordings.feedback");

  const { execute, isExecuting } = useAction(submitFeedbackAction, {
    onSuccess: () => {
      toast.success(t("feedbackSubmitted"));
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t("submitError"));
    },
  });

  return { execute, isExecuting };
}
