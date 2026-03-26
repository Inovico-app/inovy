"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { updateAgentConfig } from "@/features/admin/actions/update-agent-config";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface AgentConfigToggleProps {
  organizationId: string;
  organizationName: string;
  enabled: boolean;
}

export function AgentConfigToggle({
  organizationId,
  organizationName,
  enabled,
}: AgentConfigToggleProps) {
  const t = useTranslations("admin.agentConfig");
  const [isOpen, setIsOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState(() => enabled);

  const { execute, status } = useAction(updateAgentConfig, {
    onSuccess: ({ data }) => {
      if (
        data &&
        typeof data === "object" &&
        "success" in data &&
        data.success
      ) {
        toast.success(
          pendingEnabled
            ? t("agentEnabled", { name: organizationName })
            : t("agentDisabled", { name: organizationName }),
        );
        setIsOpen(false);
      }
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError ||
          (pendingEnabled ? t("enableFailed") : t("disableFailed")),
      );
    },
  });

  const handleToggle = (newEnabled: boolean) => {
    if (newEnabled) {
      // Enabling - no confirmation needed
      setPendingEnabled(true);
      execute({ organizationId, enabled: true });
    } else {
      // Disabling - show confirmation dialog
      setPendingEnabled(false);
      setIsOpen(true);
    }
  };

  const handleConfirmDisable = () => {
    execute({ organizationId, enabled: false });
  };

  const isLoading = status === "executing";

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
        {!enabled && (
          <AlertDialogTrigger
            render={
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              />
            }
          >
            Confirm
          </AlertDialogTrigger>
        )}
      </div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("disableTitle", { name: organizationName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will disable the AI agent for this organization. Users will see
            warning messages when trying to use chat functionality and other
            agent features. Organization admins and owners will be notified via
            email.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDisable}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? t("disabling") : t("disableAgent")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
