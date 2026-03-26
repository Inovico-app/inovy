import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentConfigList } from "@/features/admin/components/agent/agent-config-list";
import { AgentSettings } from "@/features/admin/components/agent/agent-settings";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export const metadata = {
  title: "Agent Configuration",
  description: "Manage agent configuration for all organizations",
};

async function AgentConfigContent() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr()) {
    redirect("/sign-in");
  }

  const { user } = authResult.value;

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has superadmin permissions
  const hasSuperAdminPermission = await checkPermission(
    Permissions.superadmin.all,
  );

  if (!hasSuperAdminPermission) {
    redirect("/");
  }

  const t = await getTranslations("admin.agentConfig");

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <Tabs defaultValue="organizations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="organizations">
            {t("organizationsTab")}
          </TabsTrigger>
          <TabsTrigger value="settings">{t("settingsTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          <Suspense
            fallback={
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={`skeleton-${i}`} className="h-24 w-full" />
                ))}
              </div>
            }
          >
            <AgentConfigList />
          </Suspense>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <AgentSettings />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AgentConfigPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
          <div className="mb-10 space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={`skeleton-${i}`} className="h-24 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <AgentConfigContent />
    </Suspense>
  );
}
