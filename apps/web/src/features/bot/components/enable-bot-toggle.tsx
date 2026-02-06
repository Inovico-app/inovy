"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConsentDialog } from "./consent-dialog";
import { updateBotSettings } from "../actions/update-bot-settings";
import type { BotSettings } from "@/server/db/schema/bot-settings";

interface EnableBotToggleProps {
  settings: BotSettings;
  onUpdate: () => void;
}

/**
 * Enable/disable bot toggle component with consent dialog
 */
export function EnableBotToggle({ settings, onUpdate }: EnableBotToggleProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingEnable, setPendingEnable] = useState(false);

  const handleToggle = async () => {
    const newValue = !settings.botEnabled;

    // If enabling, show consent dialog first
    if (newValue && !settings.botEnabled) {
      setPendingEnable(true);
      setShowConsentDialog(true);
      return;
    }

    // If disabling, proceed directly
    await updateSettings(newValue);
  };

  const handleConsentAccept = async () => {
    setShowConsentDialog(false);
    if (pendingEnable) {
      await updateSettings(true);
      setPendingEnable(false);
    }
  };

  const updateSettings = async (enabled: boolean) => {
    setIsSaving(true);

    try {
      const result = await updateBotSettings({
        botEnabled: enabled,
        autoJoinEnabled: enabled ? settings.autoJoinEnabled : false,
        requirePerMeetingConsent: settings.requirePerMeetingConsent,
        botDisplayName: settings.botDisplayName,
        botJoinMessage: settings.botJoinMessage,
        calendarIds: settings.calendarIds,
        inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes,
      });

      if (result?.data) {
        toast.success(
          enabled
            ? "Bot enabled successfully"
            : "Bot disabled successfully",
          {
            description: enabled
              ? "The bot will now join your meetings automatically"
              : "The bot will no longer join your meetings",
          }
        );
        onUpdate();
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      console.error("Failed to update bot settings:", error);
      toast.error("Failed to update bot settings", {
        description: "Please try again",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Meeting Bot</CardTitle>
          <CardDescription>
            Enable automatic bot joining for your Google Meet meetings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="bot-enabled" className="text-base font-medium">
                Enable Bot
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow the bot to automatically join and record your meetings
              </p>
            </div>
            <Button
              id="bot-enabled"
              variant={settings.botEnabled ? "default" : "outline"}
              onClick={handleToggle}
              disabled={isSaving}
              className="min-w-[100px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : settings.botEnabled ? (
                "Enabled"
              ) : (
                "Disabled"
              )}
            </Button>
          </div>

          {settings.botEnabled && (
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-2">Bot is active</p>
              <p className="text-muted-foreground">
                The bot will automatically join your Google Meet meetings based
                on your calendar and configuration settings below.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onAccept={handleConsentAccept}
      />
    </>
  );
}
