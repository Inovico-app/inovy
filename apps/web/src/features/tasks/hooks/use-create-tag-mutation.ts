"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createTag } from "../actions/create-tag";

export function useCreateTagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; color: string }) => {
      const result = await createTag(input);
      if (result.serverError || !result.data) {
        throw new Error(result.serverError ?? "Failed to create tag");
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate tags query to refetch
      queryClient.invalidateQueries({ queryKey: ["organization-tags"] });
      toast.success("Tag created successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create tag");
    },
  });
}

