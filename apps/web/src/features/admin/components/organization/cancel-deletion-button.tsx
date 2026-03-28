"use client";

import { Button } from "@/components/ui/button";
import { Loader2Icon, XCircleIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelOrganizationDeletion } from "../../actions/cancel-organization-deletion";

interface CancelDeletionButtonProps {
  organizationId: string;
  scheduledDeletionAt: Date;
  variant?: "default" | "outline" | "destructive";
}

export function CancelDeletionButton({
  organizationId,
  scheduledDeletionAt,
  variant = "outline",
}: CancelDeletionButtonProps) {
  const t = useTranslations("settings");
  const router = useRouter();

  const { execute: cancelDeletion, isExecuting: isCancelling } = useAction(
    cancelOrganizationDeletion,
    {
      onSuccess: () => {
        toast.success(t("deleteOrg.cancelledSuccess"));
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? t("deleteOrg.cancelFailed"));
      },
    },
  );

  const formattedDate = scheduledDeletionAt.toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <p className="text-sm text-muted-foreground">
        {t("deleteOrg.scheduledMessage", { date: formattedDate })}
      </p>
      <Button
        variant={variant}
        size="sm"
        disabled={isCancelling}
        onClick={() => cancelDeletion({ organizationId })}
        className="shrink-0 gap-2"
      >
        {isCancelling ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" />
            {t("deleteOrg.cancelling")}
          </>
        ) : (
          <>
            <XCircleIcon className="h-4 w-4" />
            {t("deleteOrg.cancelButton")}
          </>
        )}
      </Button>
    </div>
  );
}
