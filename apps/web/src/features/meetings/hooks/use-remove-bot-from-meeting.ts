"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { removeBotFromMeeting } from "../actions/remove-bot-from-meeting";
import type { BotSession } from "@/server/db/schema/bot-sessions";

const BOT_SESSIONS_QUERY_KEY = ["bot-sessions"] as const;

export interface RemoveBotFromMeetingInput {
  calendarEventId?: string;
  sessionId?: string;
}

interface UseRemoveBotFromMeetingOptions {
  onSuccess?: () => void;
}

/**
 * Hook for removing a bot from a meeting
 * Supports both calendarEventId (meetings UI) and sessionId (bot sessions page)
 * Uses optimistic updates and invalidates bot sessions cache
 */
export function useRemoveBotFromMeeting(
  options?: UseRemoveBotFromMeetingOptions
) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async (input: RemoveBotFromMeetingInput) => {
      const result = await removeBotFromMeeting(input);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (!result?.data?.success) {
        throw new Error("Failed to remove bot from meeting");
      }

      return result.data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: BOT_SESSIONS_QUERY_KEY });

      const previousData = queryClient.getQueriesData<Record<string, BotSession>>(
        { queryKey: BOT_SESSIONS_QUERY_KEY }
      );

      // Optimistic update: remove session from cache for calendarEventId
      if (input.calendarEventId) {
        queryClient.setQueriesData<Record<string, BotSession>>(
          { queryKey: BOT_SESSIONS_QUERY_KEY },
          (old) => {
            if (!old) return old;
            const { [input.calendarEventId!]: _, ...rest } = old;
            return rest;
          }
        );
      }

      return { previousData, input };
    },
    onError: (error, _input, context) => {
      toast.error("Failed to remove bot", {
        description: error.message || "Please try again",
      });

      if (context?.previousData) {
        context.previousData.forEach(([queryKey, previousQueryData]) => {
          queryClient.setQueryData(queryKey as QueryKey, previousQueryData);
        });
      }
    },
    onSuccess: (_data, _input, _context) => {
      toast.success("Bot removed from meeting", {
        description: "The bot will not join this meeting.",
      });
      queryClient.invalidateQueries({ queryKey: BOT_SESSIONS_QUERY_KEY });
      options?.onSuccess?.();
      router.refresh();
    },
  });

  return {
    execute: mutation.mutate,
    isExecuting: mutation.isPending,
  };
}
