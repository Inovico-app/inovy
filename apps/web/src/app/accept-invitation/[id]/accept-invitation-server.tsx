import { InvitationService } from "@/server/services/invitation.service";
import { AcceptInvitationClient } from "./accept-invitation-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";

interface AcceptInvitationServerProps {
  invitationId: string;
}

/**
 * Server component that fetches invitation data for display
 * Handles different invitation states (not found, expired, already accepted)
 */
export async function AcceptInvitationServer({
  invitationId,
}: AcceptInvitationServerProps) {
  // Fetch invitation details
  const invitationResult = await InvitationService.getInvitationDetails(
    invitationId
  );

  // Handle invitation not found
  if (invitationResult.isErr()) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invitation Not Found</AlertTitle>
          <AlertDescription>
            This invitation link is invalid or has been removed. Please contact
            the person who invited you for a new invitation.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const invitation = invitationResult.value;

  // Check if invitation is expired
  if (new Date() > invitation.expiresAt) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Alert variant="destructive">
          <Clock className="h-4 w-4" />
          <AlertTitle>Invitation Expired</AlertTitle>
          <AlertDescription>
            This invitation has expired. Please contact{" "}
            <strong>{invitation.inviter.name || invitation.inviter.email}</strong>{" "}
            for a new invitation to join{" "}
            <strong>{invitation.organization.name}</strong>.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if invitation is already accepted
  if (invitation.status !== "pending") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Invitation Already Processed</AlertTitle>
          <AlertDescription>
            This invitation has already been{" "}
            {invitation.status === "accepted" ? "accepted" : "processed"}. If
            you believe this is an error, please contact{" "}
            <strong>{invitation.inviter.name || invitation.inviter.email}</strong>
            .
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Invitation is valid - pass to client component
  return (
    <AcceptInvitationClient
      invitation={{
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organization: invitation.organization,
        inviter: invitation.inviter,
        pendingTeamIds: invitation.pendingTeamIds,
      }}
    />
  );
}

