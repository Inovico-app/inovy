"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "../../../lib/query-keys";
import { updateUserNotes } from "../actions/update-user-notes";

interface UpdateUserNotesVariables {
  recordingId: string;
  userNotes: string;
}

interface UseUpdateUserNotesMutationOptions {
  onSuccess?: () => void;
}

export function useUpdateUserNotesMutation(
  options?: UseUpdateUserNotesMutationOptions
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: UpdateUserNotesVariables) => {
      const result = await updateUserNotes(variables);
      
      if (result?.serverError || !result?.data) {
        throw new Error(result?.serverError || "Failed to update user notes");
      }
      
      return result.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate summary queries to refetch with updated notes
      queryClient.invalidateQueries({
        queryKey: queryKeys.summaries.detail(variables.recordingId),
      });

      toast.success("Notes saved successfully");
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to save notes", {
        description: error.message,
      });
    },
  });
}

