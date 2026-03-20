"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { addBotToMeeting } from "../actions/add-bot-to-meeting";
import type { BotSession } from "@/server/db/schema/bot-sessions";
import { queryKeys } from "@/lib/query-keys";

interface UseAddBotToMeetingOptions {
  onSuccess?: () => void;
}

export interface AddBotToMeetingInput {
  calendarEventId: string;
  meetingUrl: string;
  meetingTitle?: string;
  projectId?: string;
}

function createOptimisticSession(calendarEventId: string): BotSession {
  return {
    id: `optimistic-${calendarEventId}`,
    projectId: "",
    organizationId: "",
    userId: "",
    recallBotId: "",
    recallStatus: "joining",
    meetingUrl: "",
    meetingTitle: null,
    calendarEventId,
    botStatus: "joining",
    joinedAt: null,
    leftAt: null,
    error: null,
    retryCount: 0,
    meetingParticipants: null,
    meetingId: null,
    subscriptionId: null,
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
        throw new Error("Failed to add notetaker to meeting");
      }

      return result.data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.botSessions.all,
      });

      const previousData = queryClient.getQueriesData<
        Record<string, BotSession>
      >({ queryKey: queryKeys.botSessions.all });

      const optimisticSession = createOptimisticSession(input.calendarEventId);

      queryClient.setQueriesData<Record<string, BotSession>>(
        { queryKey: queryKeys.botSessions.all },
        (old) => {
          if (!old) return old;
          if (old[input.calendarEventId]) return old;
          return { ...old, [input.calendarEventId]: optimisticSession };
        },
      );

      return { previousData, calendarEventId: input.calendarEventId };
    },
    onError: (error, _input, context) => {
      toast.error("Failed to add notetaker", {
        description: error.message || "Please try again",
      });

      if (context?.previousData) {
        context.previousData.forEach(([queryKey, previousQueryData]) => {
          queryClient.setQueryData(queryKey as QueryKey, previousQueryData);
        });
      }
    },
    onSuccess: (data) => {
      if ("success" in data && data.success && data.sessionId) {
        toast.success("Notetaker added to meeting", {
          description: "The notetaker will join when the meeting starts.",
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.botSessions.all,
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.meetings.all,
        });
        options?.onSuccess?.();
      }
    },
  });

  return {
    execute: mutation.mutate,
    isExecuting: mutation.isPending,
  };
}
