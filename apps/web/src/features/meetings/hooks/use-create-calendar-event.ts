"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { createCalendarEventWithBot } from "../actions/create-calendar-event-with-bot";

interface UseCreateCalendarEventOptions {
  onSuccess?: (data: {
    eventId: string;
    eventUrl: string;
    sessionId?: string;
    error?: string;
  }) => void;
  onError?: (error: { serverError?: string }) => void;
}

/**
 * Hook for creating calendar events with optional bot session
 * Handles the server action call, loading state, and success/error handling
 */
export function useCreateCalendarEvent(
  options?: UseCreateCalendarEventOptions,
) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const { execute, isExecuting } = useAction(createCalendarEventWithBot, {
    onSuccess: ({ data }) => {
      if (data) {
        const { eventUrl, sessionId, error } = data;

        if (error) {
          toast.warning(t("toast.eventCreatedWithWarnings"), {
            description: error,
            action: eventUrl
              ? {
                  label: t("toast.openEvent"),
                  onClick: () => {
                    window.open(eventUrl, "_blank");
                  },
                }
              : undefined,
          });
        } else {
          toast.success(t("toast.eventCreated"), {
            description: sessionId
              ? t("toast.eventCreatedWithBot")
              : t("toast.eventCreatedWithoutBot"),
            action: eventUrl
              ? {
                  label: t("toast.openEvent"),
                  onClick: () => {
                    window.open(eventUrl, "_blank");
                  },
                }
              : undefined,
          });
        }

        // Invalidate meetings query cache to show the new event immediately
        void queryClient.invalidateQueries({
          queryKey: queryKeys.meetings.all,
        });

        // Refresh the page to ensure all server components are updated
        router.refresh();

        // Call custom onSuccess callback if provided
        optionsRef.current?.onSuccess?.(data);
      }
    },
    onError: ({ error }) => {
      toast.error(t("toast.eventCreateFailed"), {
        description: error.serverError || t("toast.pleaseTryAgain"),
      });

      // Call custom onError callback if provided
      optionsRef.current?.onError?.(error);
    },
  });

  return {
    createEvent: execute,
    isCreating: isExecuting,
  };
}
