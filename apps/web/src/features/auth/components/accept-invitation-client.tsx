"use client";

import { useAcceptInvitation } from "@/features/auth/hooks/use-accept-invitation";
import { useSession } from "@/lib/auth-client";
import { InvitationAcceptForm } from "./invitation/invitation-accept-form";
import { InvitationEmailMismatch } from "./invitation/invitation-email-mismatch";
import { InvitationLoadingState } from "./invitation/invitation-loading-state";
import { InvitationNotAuthenticated } from "./invitation/invitation-not-authenticated";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  organization: {
    id: string;
    name: string;
  };
  inviter: {
    id: string;
    name: string | null;
    email: string;
  };
  pendingTeamIds: string[];
}

interface AcceptInvitationClientProps {
  invitation: InvitationData;
}

/**
 * Client component for invitation acceptance UI
 * Orchestrates authentication check, acceptance flow, and redirects
 */
export function AcceptInvitationClient({
  invitation,
}: AcceptInvitationClientProps) {
  const { isPending, data: session } = useSession();
  const { acceptInvitation, isAccepting } = useAcceptInvitation();

  // Show loading state while checking authentication
  if (isPending) {
    return <InvitationLoadingState />;
  }

  const userEmail = session?.user?.email;

  // Show sign up/sign in prompt if not authenticated
  if (!session) {
    return (
      <InvitationNotAuthenticated
        invitationId={invitation.id}
        organization={invitation.organization}
        inviter={invitation.inviter}
        email={invitation.email}
        pendingTeamIds={invitation.pendingTeamIds}
      />
    );
  }

  // Check if user email matches invitation email
  if (userEmail && userEmail !== invitation.email) {
    return (
      <InvitationEmailMismatch
        userEmail={userEmail}
        invitationId={invitation.id}
        invitationEmail={invitation.email}
      />
    );
  }

  // User is authenticated and email matches - show accept button
  return (
    <InvitationAcceptForm
      organization={invitation.organization}
      inviter={invitation.inviter}
      email={invitation.email}
      role={invitation.role}
      pendingTeamIds={invitation.pendingTeamIds}
      onAccept={() => acceptInvitation(invitation.id)}
      isAccepting={isAccepting}
    />
  );
}

