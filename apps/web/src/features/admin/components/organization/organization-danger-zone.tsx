"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { CancelDeletionButton } from "./cancel-deletion-button";
import { DeleteOrganizationDialog } from "./delete-organization-dialog";

interface OrganizationDangerZoneProps {
  organizationId: string;
  organizationName: string;
  scheduledDeletionAt?: Date | null;
}

export function OrganizationDangerZone({
  organizationId,
  organizationName,
  scheduledDeletionAt,
}: OrganizationDangerZoneProps) {
  const t = useTranslations("settings");

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <TrashIcon className="h-5 w-5" />
          {t("deleteOrg.dangerZoneTitle")}
        </CardTitle>
        <CardDescription>
          {t("deleteOrg.dangerZoneDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scheduledDeletionAt ? (
          <CancelDeletionButton
            organizationId={organizationId}
            scheduledDeletionAt={scheduledDeletionAt}
          />
        ) : (
          <DeleteOrganizationDialog
            organizationId={organizationId}
            organizationName={organizationName}
          />
        )}
      </CardContent>
    </Card>
  );
}
