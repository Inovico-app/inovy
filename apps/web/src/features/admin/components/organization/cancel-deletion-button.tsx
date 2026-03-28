"use client";

import { Button } from "@/components/ui/button";
import { Loader2Icon, XCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const [isCancelling, setIsCancelling] = useState(false);

  const formattedDate = scheduledDeletionAt.toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelOrganizationDeletion({ organizationId });

      if (result?.data) {
        toast.success(t("deleteOrg.cancelledSuccess"));
        router.refresh();
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <p className="text-sm text-muted-foreground">
        {t("deleteOrg.scheduledMessage", { date: formattedDate })}
      </p>
      <Button
        variant={variant}
        size="sm"
        disabled={isCancelling}
        onClick={handleCancel}
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
