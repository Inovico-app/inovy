"use client";

import { useAction } from "next-safe-action/hooks";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getOrCreateMeeting } from "../actions/meeting-actions";

interface UseNavigateToMeetingOptions {
  onBeforeNavigate?: () => void;
}

export function useNavigateToMeeting(options?: UseNavigateToMeetingOptions) {
  const t = useTranslations("meetings");
  const router = useRouter();

  const { execute, isExecuting, reset } = useAction(getOrCreateMeeting, {
    onSuccess: ({ data }) => {
      if (!data?.meetingId) return;
      options?.onBeforeNavigate?.();

      // Preserve current calendar search params so the back button can restore state
      const calendarSearch = window.location.search;
      const returnTo = calendarSearch
        ? `?returnTo=${encodeURIComponent(calendarSearch)}`
        : "";
      router.push(`/meetings/${data.meetingId}/prep${returnTo}` as Route);

      // Reset action state to prevent re-triggering on component remount
      reset();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || t("toast.openMeetingFailed"));
    },
  });

  return {
    navigateToMeeting: execute,
    isNavigating: isExecuting,
  };
}
