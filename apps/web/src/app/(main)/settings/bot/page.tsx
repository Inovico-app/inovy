import { PageHeader } from "@/components/page-header";
import { BotSettingsContent } from "@/features/bot/components/bot-settings-content";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger, serializeError } from "@/lib/logger";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { Suspense } from "react";

async function BotSettingsContentWrapper() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.user) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load bot settings. Please try again.
        </p>
      </div>
    );
  }

  const { user, organization } = authResult.value;

  if (!organization) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Organization context required
        </p>
      </div>
    );
  }

  const settingsResult = await getCachedBotSettings(user.id, organization.id);

  if (settingsResult.isErr()) {
    logger.error("Failed to load bot settings", {
      userId: user.id,
      organizationId: organization.id,
      error: serializeError(settingsResult.error),
    });
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load bot settings. Please try again.
        </p>
      </div>
    );
  }

  return <BotSettingsContent initialSettings={settingsResult.value} />;
}

export default function BotSettingsPage() {
  return (
    <>
      <PageHeader
        title="Bot Settings"
        description="Configure your meeting bot preferences and manage recording consent"
      />
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        }
      >
        <BotSettingsContentWrapper />
      </Suspense>
    </>
  );
}
