"use client";

import { AlertCircle, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("errors");
  const isOrganizationError =
    error.isOrganizationViolation ||
    error.code === "NOT_FOUND" ||
    error.code === "FORBIDDEN" ||
    error.message.toLowerCase().includes("organization");

  if (isOrganizationError) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{t("accessDeniedTitle")}</AlertTitle>
        <AlertDescription>
          {t("accessDeniedDescription")}
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>{t("accessDeniedReason1")}</li>
            <li>{t("accessDeniedReason2")}</li>
            <li>{t("accessDeniedReason3")}</li>
          </ul>
          <p className="mt-2">{t("contactAdmin")}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{t("errorTitle")}</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}
