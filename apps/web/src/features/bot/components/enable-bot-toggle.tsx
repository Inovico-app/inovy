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
import type { BotSettings } from "@/server/db/schema/bot-settings";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useUpdateBotSettings } from "../hooks/use-update-bot-settings";
import { ConsentDialog } from "./consent-dialog";

interface EnableBotToggleProps {
  settings: BotSettings;
  onUpdate: () => void;
}

/**
 * Enable/disable bot toggle component with consent dialog
 */
export function EnableBotToggle({ settings, onUpdate }: EnableBotToggleProps) {
  const [isConsentDialogOpen, setIsConsentDialogOpen] = useState(false);
  const [isPendingEnable, setIsPendingEnable] = useState(false);

  const { updateBotSettings, isUpdating: isSaving } = useUpdateBotSettings({
    onUpdate,
  });

  const handleToggle = () => {
    const newValue = !settings.botEnabled;

    // If enabling, show consent dialog first
    if (newValue) {
      setIsPendingEnable(true);
      setIsConsentDialogOpen(true);
      return;
    }

    // If disabling, proceed directly
    updateSettings(newValue);
  };

  const handleConsentAccept = () => {
    setIsConsentDialogOpen(false);
    if (isPendingEnable) {
      updateSettings(true);
      setIsPendingEnable(false);
    }
  };

  const updateSettings = (enabled: boolean) => {
    updateBotSettings({
      botEnabled: enabled,
      autoJoinEnabled: enabled ? settings.autoJoinEnabled : false,
      requirePerMeetingConsent: settings.requirePerMeetingConsent,
      botDisplayName: settings.botDisplayName,
      botJoinMessage: settings.botJoinMessage,
      calendarIds: settings.calendarIds,
      inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes,
    });
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
        open={isConsentDialogOpen}
        onOpenChange={setIsConsentDialogOpen}
        onAccept={handleConsentAccept}
      />
    </>
  );
}

