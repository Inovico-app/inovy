import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  softDeleteConversationAction,
  restoreConversationAction,
  archiveConversationAction,
  unarchiveConversationAction,
} from "../actions/conversation-history";
import { toast } from "sonner";

export function useConversationActions() {
  const queryClient = useQueryClient();

  const softDelete = useMutation({
    mutationFn: async (conversationId: string) => {
      const result = await softDeleteConversationAction({ conversationId });
      if (!result?.data?.success) {
        throw new Error("Failed to delete conversation");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete conversation: ${error.message}`);
    },
  });

  const restore = useMutation({
    mutationFn: async (conversationId: string) => {
      const result = await restoreConversationAction({ conversationId });
      if (!result?.data?.success) {
        throw new Error("Failed to restore conversation");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore conversation: ${error.message}`);
    },
  });

  const archive = useMutation({
    mutationFn: async (conversationId: string) => {
      const result = await archiveConversationAction({ conversationId });
      if (!result?.data?.success) {
        throw new Error("Failed to archive conversation");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation archived successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive conversation: ${error.message}`);
    },
  });

  const unarchive = useMutation({
    mutationFn: async (conversationId: string) => {
      const result = await unarchiveConversationAction({ conversationId });
      if (!result?.data?.success) {
        throw new Error("Failed to unarchive conversation");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation unarchived successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to unarchive conversation: ${error.message}`);
    },
  });

  return {
    softDelete,
    restore,
    archive,
    unarchive,
  };
}

