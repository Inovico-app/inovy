import { AgentDisabledBanner } from "@/components/agent-disabled-banner";
import { PageHeader } from "@/components/page-header";
import { KnowledgeBaseBrowser } from "@/features/agent/components/knowledge-base-browser";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { getCachedAgentConfig } from "@/server/cache/organization.cache";
import { getCachedUserProjects } from "@/server/cache/project.cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Activity, Suspense } from "react";

async function AgentContent() {
  const t = await getTranslations("settings.agent");
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.organization) {
    return (
      <div className="text-center">
        <p className="text-destructive">
          Failed to load organization information
        </p>
      </div>
    );
  }

  // Verify user has permission to manage agent settings
  const hasPermission = await checkPermission(Permissions.setting.update);
  if (!hasPermission) {
    redirect("/settings");
  }

  const { organization, userTeamIds, user } = authResult.value;
  const organizationId = organization.id;

  // Fetch projects for filtering (cached), filtered by team context
  const projects = await getCachedUserProjects(organizationId, {
    userTeamIds,
    user: user ?? undefined,
  });

  // Check if agent is enabled
  const agentEnabled = await getCachedAgentConfig(organizationId);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {/* Agent Disabled Banner */}
      <Activity mode={!agentEnabled ? "visible" : "hidden"}>
        <div className="p-4 shrink-0">
          <AgentDisabledBanner organizationName={organization.name} />
        </div>
      </Activity>

      {/* Knowledge Base Browser */}
      <KnowledgeBaseBrowser
        organizationId={organizationId}
        projects={projects}
        agentEnabled={agentEnabled}
      />
    </>
  );
}

export default function AgentPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <AgentContent />
    </Suspense>
  );
}
