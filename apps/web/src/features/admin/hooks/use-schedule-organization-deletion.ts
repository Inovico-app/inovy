import { useAction } from "next-safe-action/hooks";
import { scheduleOrganizationDeletion } from "../actions/schedule-organization-deletion";

export function useScheduleOrganizationDeletion(
  onSuccess?: () => void,
  onError?: (error: string) => void,
) {
  return useAction(scheduleOrganizationDeletion, {
    onSuccess: () => {
      onSuccess?.();
    },
    onError: ({ error }) => {
      onError?.(error.serverError ?? "Failed to schedule deletion");
    },
  });
}
