"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth");

  return (
    <AuthShell>
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-foreground">
            {t("invitationAcceptTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("invitationAcceptSubtitle", { organization: organization.name })}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("invitationDetailsTitle")}</CardTitle>
            <CardDescription>{t("invitationDetailsSubtitle")}</CardDescription>
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
                className="flex-1"
              >
                {isAccepting
                  ? t("invitationAccepting")
                  : t("invitationAcceptButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
