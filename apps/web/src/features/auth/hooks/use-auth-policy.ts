"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import {
  deleteAuthPolicy,
  getAuthPolicy,
  updateAuthPolicy,
} from "../actions/auth-policy.actions";

export function useUpdateAuthPolicy() {
  return useAction(updateAuthPolicy, {
    onSuccess: ({ data }) => {
      if (data?.data?.message) {
        toast.success(data.data.message);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to update authentication policy");
    },
  });
}

export function useGetAuthPolicy() {
  return useAction(getAuthPolicy, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to get authentication policy");
    },
  });
}

export function useDeleteAuthPolicy() {
  return useAction(deleteAuthPolicy, {
    onSuccess: ({ data }) => {
      if (data?.data?.message) {
        toast.success(data.data.message);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to delete authentication policy");
    },
  });
}
