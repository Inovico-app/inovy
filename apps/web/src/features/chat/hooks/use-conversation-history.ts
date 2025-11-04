import { useQuery } from "@tanstack/react-query";
import { listConversationsAction } from "../actions/conversation-history";
import type { ListConversationsInput } from "@/server/validation/chat/conversation-history";

export function useConversationHistory(
  params: ListConversationsInput,
  enabled = true
) {
  return useQuery({
    queryKey: ["conversations", params],
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

