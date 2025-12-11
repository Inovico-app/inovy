import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface InvitationEmailMismatchProps {
  userEmail: string;
}

/**
 * Component shown when authenticated user's email doesn't match invitation email
 */
export function InvitationEmailMismatch({
  userEmail,
}: InvitationEmailMismatchProps) {
  return (
    <AuthShell>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>E-mail komt niet overeen</AlertTitle>
        <AlertDescription>
          Je bent ingelogd met <strong>{userEmail}</strong>, maar deze
          uitnodiging is voor iemand anders bedoeld. Log uit en log in met het
          juiste e-mailadres om de uitnodiging te accepteren.
        </AlertDescription>
      </Alert>
    </AuthShell>
  );
}

