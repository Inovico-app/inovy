"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptInvitationAction } from "@/features/auth/actions/accept-invitation";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Users, Building2, User, Mail } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

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
 * Handles authentication check, acceptance flow, and redirects
 */
export function AcceptInvitationClient({
  invitation,
}: AcceptInvitationClientProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user) {
          setIsAuthenticated(true);
          setUserEmail(session.data.user.email);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Server action for accepting invitation
  const { execute: acceptInvitation, isExecuting: isAccepting } = useAction(
    acceptInvitationAction,
    {
      onSuccess: () => {
        toast.success("Uitnodiging geaccepteerd! Je wordt doorgestuurd...");
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/" as Route);
        }, 1500);
      },
      onError: ({ error }) => {
        const errorMessage =
          error.serverError ?? "Failed to accept invitation";
        toast.error(errorMessage);
      },
    }
  );

  const handleAccept = () => {
    acceptInvitation({ invitationId: invitation.id });
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <AuthShell>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </AuthShell>
    );
  }

  // Show sign up/sign in prompt if not authenticated
  if (!isAuthenticated) {
    const signInUrl = `/sign-in?redirect=${encodeURIComponent(
      `/accept-invitation/${invitation.id}`
    )}`;
    const signUpUrl = `/sign-up?redirect=${encodeURIComponent(
      `/accept-invitation/${invitation.id}`
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
              <strong>{invitation.organization.name}</strong>
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
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Organisatie:</span>
                  <span>{invitation.organization.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Uitgenodigd door:</span>
                  <span>
                    {invitation.inviter.name || invitation.inviter.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">E-mail:</span>
                  <span>{invitation.email}</span>
                </div>
                {invitation.pendingTeamIds.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Teams:</span>
                    <span>{invitation.pendingTeamIds.length} team(s)</span>
                  </div>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Account vereist</AlertTitle>
                <AlertDescription>
                  Je moet ingelogd zijn met het e-mailadres{" "}
                  <strong>{invitation.email}</strong> om deze uitnodiging te
                  accepteren.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="flex-1"
                >
                  <Link href={signInUrl as Route}>Inloggen</Link>
                </Button>
                <Button
                  asChild
                  className="flex-1"
                >
                  <Link href={signUpUrl as Route}>Account aanmaken</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthShell>
    );
  }

  // Check if user email matches invitation email
  if (userEmail && userEmail !== invitation.email) {
    return (
      <AuthShell>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>E-mail komt niet overeen</AlertTitle>
          <AlertDescription>
            Je bent ingelogd met <strong>{userEmail}</strong>, maar deze
            uitnodiging is voor <strong>{invitation.email}</strong>. Log uit en
            log in met het juiste e-mailadres om de uitnodiging te accepteren.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  // User is authenticated and email matches - show accept button
  return (
    <AuthShell>
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-foreground">
            Uitnodiging accepteren
          </h1>
          <p className="text-muted-foreground">
            Je bent uitgenodigd om lid te worden van{" "}
            <strong>{invitation.organization.name}</strong>
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
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Organisatie:</span>
                <span>{invitation.organization.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Uitgenodigd door:</span>
                <span>
                  {invitation.inviter.name || invitation.inviter.email}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Rol:</span>
                <span className="capitalize">{invitation.role}</span>
              </div>
              {invitation.pendingTeamIds.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Je wordt toegevoegd aan:</span>
                  <span>{invitation.pendingTeamIds.length} team(s)</span>
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-2">
              <Button
                onClick={handleAccept}
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

