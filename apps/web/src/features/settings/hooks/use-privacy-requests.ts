"use client";

import type {
  PrivacyRequest,
  PrivacyRequestType,
  ProcessingScope,
} from "@/server/db/schema/privacy-requests";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import {
  getPrivacyRequestsAction,
  submitPrivacyRequestAction,
  withdrawPrivacyRequestAction,
} from "../actions/privacy-request";

/**
 * Hook for managing privacy requests (Right to Restriction & Right to Object)
 */
export function usePrivacyRequests(initialRequests: PrivacyRequest[] = []) {
  const [requests, setRequests] = useState<PrivacyRequest[]>(initialRequests);

  const { execute: executeSubmit, isExecuting: isSubmitting } = useAction(
    submitPrivacyRequestAction,
    {
      onSuccess: () => {
        toast.success("Privacy request submitted successfully");
        reloadRequests();
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to submit privacy request");
      },
    },
  );

  const { execute: executeWithdraw, isExecuting: isWithdrawing } = useAction(
    withdrawPrivacyRequestAction,
    {
      onSuccess: () => {
        toast.success("Privacy request withdrawn");
        reloadRequests();
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to withdraw privacy request");
      },
    },
  );

  const { execute: executeGetRequests } = useAction(getPrivacyRequestsAction, {
    onSuccess: ({ data }) => {
      const requestData = data as { data: PrivacyRequest[] } | undefined;
      setRequests(requestData?.data ?? []);
    },
    onError: () => {
      setRequests([]);
    },
  });

  const reloadRequests = () => {
    executeGetRequests();
  };

  const submitRequest = (
    type: PrivacyRequestType,
    scope: ProcessingScope,
    reason?: string,
  ) => {
    executeSubmit({ type, scope, reason });
  };

  const withdrawRequest = (requestId: string) => {
    executeWithdraw({ requestId });
  };

  const activeRequests = requests.filter((r) => r.status === "active");

  const hasActiveRestriction = (scope: ProcessingScope) =>
    activeRequests.some(
      (r) =>
        r.status === "active" &&
        (r.scope === scope || r.scope === "all_processing") &&
        r.type === "restriction",
    );

  const hasActiveObjection = (scope: ProcessingScope) =>
    activeRequests.some(
      (r) =>
        r.status === "active" &&
        (r.scope === scope || r.scope === "all_processing") &&
        r.type === "objection",
    );

  return {
    requests,
    activeRequests,
    isSubmitting,
    isWithdrawing,
    submitRequest,
    withdrawRequest,
    hasActiveRestriction,
    hasActiveObjection,
    reloadRequests,
  };
}
