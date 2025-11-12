"use client";

import { AlertCircle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface OrganizationErrorFeedbackProps {
  error: {
    code?: string;
    message: string;
    isOrganizationViolation?: boolean;
  };
}

/**
 * Component to display user-friendly error messages for organization isolation violations
 * Provides appropriate feedback without leaking sensitive information
 */
export function OrganizationErrorFeedback({
  error,
}: OrganizationErrorFeedbackProps) {
  const isOrganizationError =
    error.isOrganizationViolation ||
    error.code === "NOT_FOUND" ||
    error.code === "FORBIDDEN" ||
    error.message.toLowerCase().includes("organization");

  if (isOrganizationError) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          The resource you&apos;re trying to access either doesn&apos;t exist or you
          don&apos;t have permission to view it. This could be because:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>The resource belongs to a different organization</li>
            <li>The resource has been deleted</li>
            <li>You don&apos;t have the required permissions</li>
          </ul>
          <p className="mt-2">
            If you believe this is an error, please contact your organization
            administrator.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}

