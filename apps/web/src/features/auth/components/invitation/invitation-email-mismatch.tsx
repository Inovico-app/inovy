"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useInvitationSignOut } from "@/features/auth/hooks/use-invitation-sign-out";
import { AlertCircle, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

interface InvitationEmailMismatchProps {
  userEmail: string;
  invitationId: string;
  invitationEmail: string;
}

/**
 * Component shown when authenticated user's email doesn't match invitation email
 * Provides a sign-out button so the user can re-authenticate with the correct account
 */
export function InvitationEmailMismatch({
  userEmail,
  invitationId,
  invitationEmail,
}: InvitationEmailMismatchProps) {
  const t = useTranslations("auth");
  const { handleSignOut, isSigningOut } = useInvitationSignOut(invitationId);

  return (
    <AuthShell>
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("invitationEmailMismatchTitle")}</AlertTitle>
          <AlertDescription>
            {t("invitationEmailMismatchDescription", {
              userEmail,
              invitationEmail,
            })}
          </AlertDescription>
        </Alert>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          <LogOut className="h-4 w-4" />
          {t("invitationSignOutAndRetry")}
        </Button>
      </div>
    </AuthShell>
  );
}
