import { AcceptInvitationServer } from "./accept-invitation-server";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

interface AcceptInvitationPageProps {
  params: Promise<{ id: string }>;
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Uitnodiging laden...</p>
      </div>
    </div>
  );
}

/**
 * Public page for accepting organization invitations
 * No authentication required to view invitation details
 * Authentication is checked in the client component
 */
export default async function AcceptInvitationPage({
  params,
}: AcceptInvitationPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<LoadingState />}>
      <AcceptInvitationServer invitationId={id} />
    </Suspense>
  );
}

