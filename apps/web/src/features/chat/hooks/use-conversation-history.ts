"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { listConversationsAction } from "../actions/conversation-history";
import type { ListConversationsInput } from "@/server/validation/chat/conversation-history";

export function useConversationHistory(
  params: ListConversationsInput,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.conversations.all(params),
    queryFn: async () => {
      const result = await listConversationsAction(params);
      if (!result?.data) {
        throw new Error("Failed to fetch conversations");
      }
      return result.data;
    },
    enabled,
    staleTime: 30000, // 30 seconds
  });
}
