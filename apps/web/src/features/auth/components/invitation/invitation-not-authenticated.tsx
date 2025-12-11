import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { InvitationDetails } from "./invitation-details";

interface InvitationNotAuthenticatedProps {
  invitationId: string;
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
  pendingTeamIds: string[];
}

/**
 * Component shown when user is not authenticated
 * Displays invitation details and prompts to sign in or sign up
 */
export function InvitationNotAuthenticated({
  invitationId,
  organization,
  inviter,
  email,
  pendingTeamIds,
}: InvitationNotAuthenticatedProps) {
  const signInUrl = `/sign-in?redirect=${encodeURIComponent(
    `/accept-invitation/${invitationId}`
  )}`;
  const signUpUrl = `/sign-up?redirect=${encodeURIComponent(
    `/accept-invitation/${invitationId}`
  )}`;

  return (
    <AuthShell>
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-foreground">
            Uitnodiging ontvangen
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
              Log in of maak een account aan om de uitnodiging te accepteren
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InvitationDetails
              organization={organization}
              inviter={inviter}
              email={email}
              pendingTeamIds={pendingTeamIds}
            />

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Account vereist</AlertTitle>
              <AlertDescription>
                Je moet ingelogd zijn met het e-mailadres{" "}
                <strong>{email}</strong> om deze uitnodiging te accepteren.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href={signInUrl as Route}>Inloggen</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href={signUpUrl as Route}>Account aanmaken</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}

