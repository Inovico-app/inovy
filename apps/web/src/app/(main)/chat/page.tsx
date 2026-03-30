import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Chat" };
import { UnifiedChatInterface } from "@/features/chat/components/unified-chat-interface";
import { canAccessOrganizationChat } from "@/lib/rbac/rbac";
import { permissions } from "@/lib/permissions/engine";
import { requirePermission } from "@/lib/permissions/require-permission";
import {
  getCachedAgentConfig,
  getCachedOrganizationById,
} from "@/server/cache/organization.cache";
import { getCachedUserProjects } from "@/server/cache/project.cache";
import { AlertCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

async function ChatPageContent() {
  const t = await getTranslations("chat");
  const { user, organizationId, userTeamIds } = await requirePermission(
    permissions.hasRole("user"),
  );

  // Check if user is admin
  const isAdmin = canAccessOrganizationChat(user);

  // Get user's projects (cached), filtered by team context
  const projects = await getCachedUserProjects(organizationId, {
    userTeamIds,
    user,
  });

  // Check if agent is enabled
  const [agentEnabled, organization] = await Promise.all([
    getCachedAgentConfig(organizationId),
    getCachedOrganizationById(organizationId),
  ]);

  // If no projects and not admin, show error
  if (projects.length === 0 && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-4rem)] p-4">
        <Card className="max-w-md w-full p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{t("noProjectsTitle")}</h2>
              <p className="text-muted-foreground">
                {t("noProjectsDescription")}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-4rem)]">
      <UnifiedChatInterface
        isAdmin={isAdmin}
        projects={projects}
        defaultContext={isAdmin ? "organization" : "project"}
        defaultProjectId={projects[0]?.id}
        agentEnabled={agentEnabled}
        organizationName={organization?.name}
      />
    </div>
  );
}

export default async function OrganizationChatPage() {
  return await ChatPageContent();
}
