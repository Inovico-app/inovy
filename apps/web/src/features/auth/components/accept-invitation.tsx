import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCachedInvitationDetails } from "@/server/cache/invitations.cache";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AcceptInvitationClient } from "./accept-invitation-client";

interface AcceptInvitationProps {
  invitationId: string;
}

/**
 * Server component that fetches invitation data for display
 * Handles different invitation states (not found, expired, already accepted)
 */
export async function AcceptInvitation({
  invitationId,
}: AcceptInvitationProps) {
  const t = await getTranslations("auth");
  // Fetch invitation details
  const invitation = await getCachedInvitationDetails(invitationId);

  // Handle invitation not found
  if (!invitation) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("invitationNotFoundTitle")}</AlertTitle>
          <AlertDescription>
            {t("invitationNotFoundDescription")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if invitation is expired
  if (new Date() > invitation.expiresAt) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Alert variant="destructive">
          <Clock className="h-4 w-4" />
          <AlertTitle>{t("invitationExpiredTitle")}</AlertTitle>
          <AlertDescription>
            {t("invitationExpiredDescription", {
              inviter: invitation.inviter.name || invitation.inviter.email,
              organization: invitation.organization.name,
            })}
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
          <AlertTitle>{t("invitationAlreadyProcessedTitle")}</AlertTitle>
          <AlertDescription>
            {t("invitationAlreadyProcessedDescription", {
              status:
                invitation.status === "accepted"
                  ? t("invitationAccepted")
                  : t("invitationProcessed"),
              inviter: invitation.inviter.name || invitation.inviter.email,
            })}
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
