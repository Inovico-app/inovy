"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useInvitationSignOut } from "@/features/auth/hooks/use-invitation-sign-out";
import { AlertCircle, LogOut } from "lucide-react";

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
  const { handleSignOut, isSigningOut } = useInvitationSignOut(invitationId);

  return (
    <AuthShell>
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>E-mail komt niet overeen</AlertTitle>
          <AlertDescription>
            Je bent ingelogd met <strong>{userEmail}</strong>, maar deze
            uitnodiging is bedoeld voor <strong>{invitationEmail}</strong>. Log
            uit en log in met het juiste e-mailadres om de uitnodiging te
            accepteren.
          </AlertDescription>
        </Alert>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleSignOut}
          isLoading={isSigningOut}
        >
          <LogOut className="h-4 w-4" />
          Uitloggen en opnieuw proberen
        </Button>
      </div>
    </AuthShell>
  );
}
