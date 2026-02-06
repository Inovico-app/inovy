import { ProtectedPage } from "@/components/protected-page";
import { BotSettingsContent } from "@/features/bot/components/bot-settings-content";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger, serializeError } from "@/lib/logger";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { Suspense } from "react";

function BotSettingsLoading() {
  return (
    <div className="container mx-auto max-w-6xl py-12 px-6">
      <div className="max-w-4xl space-y-6">
        <div className="space-y-2">
          <div className="h-9 w-64 bg-muted rounded animate-pulse" />
          <div className="h-5 w-96 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-64 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

function BotSettingsContentLoading() {
  return (
    <div className="space-y-6">
      <div className="h-64 bg-muted rounded animate-pulse" />
      <div className="h-96 bg-muted rounded animate-pulse" />
    </div>
  );
}

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

  const user = authResult.value.user;
  const organization = authResult.value.organization;

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
    <Suspense fallback={<BotSettingsLoading />}>
      <ProtectedPage>
        <div className="container mx-auto max-w-6xl py-12 px-6">
          <div className="max-w-4xl space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Bot Settings</h1>
              <p className="text-muted-foreground mt-2">
                Configure your meeting bot preferences and manage recording
                consent
              </p>
            </div>
            <Suspense fallback={<BotSettingsContentLoading />}>
              <BotSettingsContentWrapper />
            </Suspense>
          </div>
        </div>
      </ProtectedPage>
    </Suspense>
  );
}

