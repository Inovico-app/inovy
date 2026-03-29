import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { BotSettingsContent } from "@/features/bot/components/bot-settings-content";

export const metadata: Metadata = {
  title: "Bot Settings",
  description: "Configure your meeting bot preferences",
};
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger, serializeError } from "@/lib/logger";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

async function BotSettingsContentWrapper() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.user) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load notetaker settings. Please try again.
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

  // Verify user has permission to manage bot settings
  const hasPermission = await checkPermission(Permissions.setting.update);
  if (!hasPermission) {
    redirect("/settings");
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
          Failed to load notetaker settings. Please try again.
        </p>
      </div>
    );
  }

  return <BotSettingsContent initialSettings={settingsResult.value} />;
}

export default async function BotSettingsPage() {
  const t = await getTranslations("settings.bot");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
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
