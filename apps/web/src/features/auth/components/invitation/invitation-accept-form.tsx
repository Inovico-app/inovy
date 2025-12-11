import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InvitationDetails } from "./invitation-details";

interface InvitationAcceptFormProps {
  organization: {
    id: string;
    name: string;
  };
  inviter: {
    id: string;
    name: string | null;
    email: string;
  };
  email: string;
  role: string;
  pendingTeamIds: string[];
  onAccept: () => void;
  isAccepting: boolean;
}

/**
 * Component for accepting an invitation
 * Shows invitation details and accept button
 */
export function InvitationAcceptForm({
  organization,
  inviter,
  email,
  role,
  pendingTeamIds,
  onAccept,
  isAccepting,
}: InvitationAcceptFormProps) {
  return (
    <AuthShell>
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-foreground">
            Uitnodiging accepteren
          </h1>
          <p className="text-muted-foreground">
            Je bent uitgenodigd om lid te worden van{" "}
            <strong>{organization.name}</strong>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Uitnodigingsdetails</CardTitle>
            <CardDescription>
              Bekijk de details voordat je de uitnodiging accepteert
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InvitationDetails
              organization={organization}
              inviter={inviter}
              email={email}
              role={role}
              pendingTeamIds={pendingTeamIds}
            />

            <div className="pt-4 flex gap-2">
              <Button
                onClick={onAccept}
                disabled={isAccepting}
                isLoading={isAccepting}
                className="flex-1"
              >
                {isAccepting ? "Accepteren..." : "Uitnodiging accepteren"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}

