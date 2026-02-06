"use client";

import type { BotSettings } from "@/server/db/schema/bot-settings";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BotConfigurationForm } from "./bot-configuration-form";
import { EnableBotToggle } from "./enable-bot-toggle";

interface BotSettingsContentProps {
  initialSettings: BotSettings;
}

/**
 * Main bot settings content component
 * Manages bot settings UI with enable toggle and configuration form
 */
export function BotSettingsContent({
  initialSettings,
}: BotSettingsContentProps) {
  const [settings, setSettings] = useState<BotSettings>(initialSettings);
  const router = useRouter();

  // Sync state with props when they change (e.g., after router.refresh())
  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const loadSettings = () => {
    // Refresh the page to reload cached data
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <EnableBotToggle settings={settings} onUpdate={loadSettings} />
      {settings.botEnabled && (
        <BotConfigurationForm settings={settings} onUpdate={loadSettings} />
      )}
    </div>
  );
}

