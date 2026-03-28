"use client";

import { Button } from "@/components/ui/button";
import { cancelOrganizationDeletion } from "@/features/admin/actions/cancel-organization-deletion";
import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DeletionWarningBannerProps {
  organizationId: string;
  scheduledDeletionAt: string;
}

export function DeletionWarningBanner({
  organizationId,
  scheduledDeletionAt,
}: DeletionWarningBannerProps) {
  const t = useTranslations("settings");
  const router = useRouter();

  const formattedDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
  }).format(new Date(scheduledDeletionAt));

  const { execute: cancelDeletion, isExecuting: isCancelling } = useAction(
    cancelOrganizationDeletion,
    {
      onSuccess: () => {
        toast.success(t("deleteOrg.cancelledSuccess"));
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? t("deleteOrg.cancelledSuccess"));
      },
    },
  );

  function handleCancelDeletion() {
    cancelDeletion({ organizationId });
  }

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangleIcon className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">
          {t("deleteOrg.warningBanner", { date: formattedDate })}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10"
        disabled={isCancelling}
        onClick={handleCancelDeletion}
      >
        {isCancelling ? (
          <Loader2Icon className="h-4 w-4 animate-spin" />
        ) : (
          t("deleteOrg.warningBannerAction")
        )}
      </Button>
    </div>
  );
}
