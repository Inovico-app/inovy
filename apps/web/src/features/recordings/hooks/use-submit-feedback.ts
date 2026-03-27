"use client";

import { submitFeedbackAction } from "@/features/recordings/actions/submit-feedback";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface UseSubmitFeedbackOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

export function useSubmitFeedback(options?: UseSubmitFeedbackOptions) {
  const t = useTranslations("recordings.feedback");

  const { execute, isExecuting } = useAction(submitFeedbackAction, {
    onSuccess: () => {
      toast.success(t("feedbackSubmitted"));
      options?.onSuccess?.();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t("submitError"));
      options?.onError?.();
    },
  });

  return { execute, isExecuting };
}
