"use client";

import type { BotSettings } from "@/server/db/schema/bot-settings";
import { useRouter } from "next/navigation";

import { BotConfigurationForm } from "./bot-configuration-form";
import { EnableBotToggle } from "./enable-bot-toggle";
import { SeriesSubscriptionsList } from "./series-subscriptions-list";

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
  const router = useRouter();

  const loadSettings = () => {
    // Refresh the page to reload cached data
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <EnableBotToggle settings={initialSettings} onUpdate={loadSettings} />
      {initialSettings.botEnabled && (
        <BotConfigurationForm
          settings={initialSettings}
          onUpdate={loadSettings}
        />
      )}
      <SeriesSubscriptionsList />
    </div>
  );
}
