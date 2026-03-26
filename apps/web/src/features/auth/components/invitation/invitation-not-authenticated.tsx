"use client";

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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth");
  const signInUrl = `/sign-in?redirect=${encodeURIComponent(
    `/accept-invitation/${invitationId}`,
  )}`;
  const signUpUrl = `/sign-up?redirect=${encodeURIComponent(
    `/accept-invitation/${invitationId}`,
  )}`;

  return (
    <AuthShell>
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-foreground">
            {t("invitationReceivedTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("invitationReceivedSubtitle", {
              organization: organization.name,
            })}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("invitationDetailsTitle")}</CardTitle>
            <CardDescription>{t("invitationSignInOrCreate")}</CardDescription>
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
              <AlertTitle>{t("invitationAccountRequired")}</AlertTitle>
              <AlertDescription>
                {t("invitationAccountRequiredDescription", { email })}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                render={<Link href={signInUrl as Route} />}
                nativeButton={false}
              >
                {t("invitationSignInButton")}
              </Button>
              <Button
                className="flex-1"
                render={<Link href={signUpUrl as Route} />}
                nativeButton={false}
              >
                {t("invitationCreateAccountButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
