"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useScheduleOrganizationDeletion } from "../../hooks/use-schedule-organization-deletion";

interface DeleteOrganizationDialogProps {
  organizationId: string;
  organizationName: string;
}

export function DeleteOrganizationDialog({
  organizationId,
  organizationName,
}: DeleteOrganizationDialogProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");

  const { execute: scheduleDelete, isExecuting } =
    useScheduleOrganizationDeletion(
      () => {
        toast.success(t("deleteOrg.scheduledSuccess"));
        setOpen(false);
        setConfirmValue("");
        router.refresh();
      },
      (error) => {
        toast.error(error);
      },
    );

  const isConfirmed = confirmValue === organizationName;

  const handleSubmit = () => {
    if (!isConfirmed) return;
    scheduleDelete({ organizationId, confirmName: confirmValue });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmValue("");
    }
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant="destructive" className="gap-2" />}
      >
        <TrashIcon className="h-4 w-4" />
        {t("deleteOrg.scheduleButton")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteOrg.title")}</DialogTitle>
          <DialogDescription>{t("deleteOrg.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm text-muted-foreground">
            {t("deleteOrg.warningItems")}
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-org-name">
              {t("deleteOrg.confirmLabel", { orgName: organizationName })}
            </Label>
            <Input
              id="confirm-org-name"
              value={confirmValue}
              onChange={(e) => setConfirmValue(e.target.value)}
              placeholder={t("deleteOrg.confirmPlaceholder")}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            disabled={!isConfirmed || isExecuting}
            onClick={handleSubmit}
            className="gap-2"
          >
            {isExecuting ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" />
                {t("deleteOrg.scheduling")}
              </>
            ) : (
              <>
                <TrashIcon className="h-4 w-4" />
                {t("deleteOrg.scheduleButton")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
