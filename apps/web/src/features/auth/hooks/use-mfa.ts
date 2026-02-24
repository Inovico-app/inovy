"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import {
  disableMfa,
  enrollMfa,
  getMfaStatus,
  regenerateBackupCodes,
  verifyMfaEnrollment,
  verifyMfaToken,
} from "../actions/mfa.actions";

export function useEnrollMfa() {
  return useAction(enrollMfa, {
    onSuccess: ({ data }) => {
      if (data?.data?.message) {
        toast.success(data.data.message);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to enroll MFA");
    },
  });
}

export function useVerifyMfaEnrollment() {
  return useAction(verifyMfaEnrollment, {
    onSuccess: ({ data }) => {
      if (data?.data?.message) {
        toast.success(data.data.message);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to verify MFA enrollment");
    },
  });
}

export function useDisableMfa() {
  return useAction(disableMfa, {
    onSuccess: ({ data }) => {
      if (data?.data?.message) {
        toast.success(data.data.message);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to disable MFA");
    },
  });
}

export function useVerifyMfaToken() {
  return useAction(verifyMfaToken, {
    onSuccess: ({ data }) => {
      if (data?.data?.message) {
        toast.success(data.data.message);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to verify MFA token");
    },
  });
}

export function useRegenerateBackupCodes() {
  return useAction(regenerateBackupCodes, {
    onSuccess: ({ data }) => {
      if (data?.data?.message) {
        toast.success(data.data.message);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to regenerate backup codes");
    },
  });
}

export function useGetMfaStatus() {
  return useAction(getMfaStatus, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to get MFA status");
    },
  });
}
