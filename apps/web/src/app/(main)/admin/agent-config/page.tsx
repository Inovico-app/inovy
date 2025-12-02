import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentConfigList } from "@/features/admin/components/agent/agent-config-list";
import { AgentSettings } from "@/features/admin/components/agent/agent-settings";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Agent Configuration",
  description: "Manage agent configuration for all organizations",
};

async function AgentConfigContent() {
  const authResult = await getAuthSession();

  if (authResult.isErr()) {
    redirect("/sign-in");
  }

  const { user } = authResult.value;

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has superadmin permissions
  const hasSuperAdminPermission = await checkPermission(
    Permissions.superadmin.all
  );

  if (!hasSuperAdminPermission) {
    redirect("/");
  }

  return (
    <div className="container mx-auto max-w-6xl py-12 px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Agent Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure agent settings and manage agent access for organizations
        </p>
      </div>

      <Tabs defaultValue="organizations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="settings">Agent Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          <Suspense
            fallback={
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
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
        <div className="container mx-auto max-w-6xl py-12 px-6">
          <div className="mb-10 space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <AgentConfigContent />
    </Suspense>
  );
}

