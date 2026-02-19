"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { BotSession } from "@/server/db/schema/bot-sessions";
import { getBotSessionDetails } from "../actions/get-bot-session-details";

export type BotSessionWithRecording = BotSession & {
  recording?: {
    id: string;
    title: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileMimeType: string;
    duration: number | null;
    recordingDate: Date;
  } | null;
};

interface UseBotSessionDetailsOptions {
  sessionId: string | null | undefined;
  enabled?: boolean;
}

/**
 * React Query hook for fetching bot session details with recording metadata
 * Used when opening the session details modal from meetings or bot sessions page
 */
export function useBotSessionDetails({
  sessionId,
  enabled = true,
}: UseBotSessionDetailsOptions) {
  return useQuery({
    queryKey: queryKeys.botSessions.detail(sessionId ?? ""),
    queryFn: async () => {
      if (!sessionId) {
        return null;
      }

      const result = await getBotSessionDetails({ sessionId });

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (!result?.data) {
        return null;
      }

      return result.data as BotSessionWithRecording;
    },
    staleTime: 60 * 1000, // Cache for 1 minute
    enabled: enabled && !!sessionId,
  });
}
