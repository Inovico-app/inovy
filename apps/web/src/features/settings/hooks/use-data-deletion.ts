"use client";

import type { UserDeletionRequest } from "@/server/db/schema/user-deletion-requests";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import {
  cancelDeletionAction,
  getDeletionStatusAction,
  requestDeletionAction,
} from "../actions/delete-user-data";

/**
 * Hook for managing user data deletion requests
 * Provides actions for requesting, canceling, and checking deletion status
 * @param initialDeletionRequest - Initial deletion request status from server
 */
export function useDataDeletion(
  initialDeletionRequest: UserDeletionRequest | null = null
) {
  const [deletionRequest, setDeletionRequest] =
    useState<UserDeletionRequest | null>(initialDeletionRequest);

  // Request deletion action
  const { execute: executeRequestDeletion, isExecuting: isRequesting } =
    useAction(requestDeletionAction, {
      onSuccess: ({ data }) => {
        if (data) {
          toast.success(
            "Your data deletion request has been processed. Your account and data have been anonymized."
          );
          // Reload status after successful deletion request
          reloadStatus();
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to process deletion request");
      },
    });

  // Cancel deletion action
  const { execute: executeCancelDeletion, isExecuting: isCancelling } =
    useAction(cancelDeletionAction, {
      onSuccess: ({ data }) => {
        if (data) {
          toast.success("Deletion request cancelled successfully");
          // Reload status after successful cancellation
          reloadStatus();
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to cancel deletion request");
      },
    });

  // Get deletion status action (for refetching after mutations)
  const { execute: executeGetStatus } = useAction(getDeletionStatusAction, {
    onSuccess: ({ data }) => {
      // The action returns { data: UserDeletionRequest | null }
      // useAction wraps it, so we need to access data.data
      const requestData = data as
        | { data: UserDeletionRequest | null }
        | undefined;
      setDeletionRequest(requestData?.data ?? null);
    },
    onError: () => {
      // Silently fail - no deletion request exists
      setDeletionRequest(null);
    },
  });

  // Reload status function (called after mutations)
  const reloadStatus = () => {
    executeGetStatus();
  };

  // Request deletion handler
  const requestDeletion = (
    confirmationText: string,
    confirmCheckbox: boolean
  ) => {
    if (confirmationText !== "DELETE MY DATA") {
      toast.error("Confirmation text must be exactly 'DELETE MY DATA'");
      return;
    }

    if (!confirmCheckbox) {
      toast.error("You must confirm that you understand the consequences");
      return;
    }

    executeRequestDeletion({
      confirmationText,
      confirmCheckbox,
    });
  };

  // Cancel deletion handler
  const cancelDeletion = (requestId: string) => {
    executeCancelDeletion({ requestId });
  };

  return {
    deletionRequest,
    isRequesting,
    isCancelling,
    requestDeletion,
    cancelDeletion,
    reloadStatus,
  };
}

