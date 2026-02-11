"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { addBotToMeeting } from "../actions/add-bot-to-meeting";
import type { BotSession } from "@/server/db/schema/bot-sessions";

interface UseAddBotToMeetingOptions {
  onConsentRequired?: () => void;
}

export interface AddBotToMeetingInput {
  calendarEventId: string;
  meetingUrl: string;
  meetingTitle?: string;
  consentGiven?: boolean;
}

const BOT_SESSIONS_QUERY_KEY = ["bot-sessions"] as const;

function createOptimisticSession(calendarEventId: string): BotSession {
  return {
    id: `optimistic-${calendarEventId}`,
    projectId: "",
    organizationId: "",
    userId: "",
    recallBotId: "",
    recallStatus: "scheduled",
    meetingUrl: "",
    meetingTitle: null,
    calendarEventId,
    botStatus: "scheduled",
    joinedAt: null,
    leftAt: null,
    error: null,
    retryCount: 0,
    meetingParticipants: null,
    recordingId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Hook for adding a bot to an existing meeting
 * Uses React Query's optimistic mutation pattern
 */
export function useAddBotToMeeting(options?: UseAddBotToMeetingOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: AddBotToMeetingInput) => {
      const result = await addBotToMeeting(input);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (!result?.data) {
        throw new Error("Failed to add bot to meeting");
      }

      return result.data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: BOT_SESSIONS_QUERY_KEY });

      const previousData = queryClient.getQueriesData<Record<string, BotSession>>(
        { queryKey: BOT_SESSIONS_QUERY_KEY }
      );

      // Skip optimistic update when consent may be required (avoids flicker on consent dialog)
      if (input.consentGiven !== true) {
        return { previousData, calendarEventId: input.calendarEventId };
      }

      const optimisticSession = createOptimisticSession(input.calendarEventId);

      queryClient.setQueriesData<Record<string, BotSession>>(
        { queryKey: BOT_SESSIONS_QUERY_KEY },
        (old) => {
          if (!old) return old;
          if (old[input.calendarEventId]) return old;
          return { ...old, [input.calendarEventId]: optimisticSession };
        }
      );

      return { previousData, calendarEventId: input.calendarEventId };
    },
    onError: (error, _input, context) => {
      toast.error("Failed to add bot", {
        description: error.message || "Please try again",
      });

      if (context?.previousData) {
        context.previousData.forEach(([queryKey, previousQueryData]) => {
          queryClient.setQueryData(queryKey as QueryKey, previousQueryData);
        });
      }
    },
    onSuccess: (data, _input, context) => {
      if ("consentRequired" in data && data.consentRequired) {
        options?.onConsentRequired?.();
        if (context?.previousData) {
          context.previousData.forEach(([queryKey, previousQueryData]) => {
            queryClient.setQueryData(queryKey as QueryKey, previousQueryData);
          });
        }
        return;
      }

      if ("success" in data && data.success && data.sessionId) {
        toast.success("Bot added to meeting", {
          description: "The bot will join when the meeting starts.",
        });
        queryClient.invalidateQueries({ queryKey: BOT_SESSIONS_QUERY_KEY });
      }
    },
  });

  return {
    execute: mutation.mutate,
    isExecuting: mutation.isPending,
  };
}
