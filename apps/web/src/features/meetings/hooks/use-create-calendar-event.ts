"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  options?: UseCreateCalendarEventOptions
) {
  const router = useRouter();

  const { execute, isExecuting } = useAction(createCalendarEventWithBot, {
    onSuccess: ({ data }) => {
      if (data) {
        const { eventUrl, sessionId, error } = data;

        if (error) {
          toast.warning("Event created with warnings", {
            description: error,
          });
        } else {
          toast.success("Calendar event created successfully", {
            description: sessionId
              ? "Event and bot session created"
              : "Event created",
          });
        }

        // Open calendar event in new tab
        if (eventUrl) {
          window.open(eventUrl, "_blank");
        }

        // Refresh the page to show the new event
        router.refresh();

        // Call custom onSuccess callback if provided
        options?.onSuccess?.(data);
      }
    },
    onError: ({ error }) => {
      toast.error("Failed to create calendar event", {
        description: error.serverError || "Please try again",
      });

      // Call custom onError callback if provided
      options?.onError?.(error);
    },
  });

  return {
    createEvent: execute,
    isCreating: isExecuting,
  };
}
