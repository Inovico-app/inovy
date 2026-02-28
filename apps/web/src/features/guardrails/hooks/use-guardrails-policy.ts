"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { updateGuardrailsPolicy } from "../actions/guardrails-policy.actions";

export function useGuardrailsPolicy() {
  const { execute, isExecuting } = useAction(updateGuardrailsPolicy, {
    onSuccess: () => {
      toast.success("AI Safety policy updated successfully");
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError ?? "Failed to update AI Safety policy"
      );
    },
  });

  return { execute, isExecuting };
}
