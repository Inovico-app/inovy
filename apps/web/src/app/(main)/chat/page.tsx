import { ProtectedPage } from "@/components/protected-page";
import { Card } from "@/components/ui/card";
import { UnifiedChatInterface } from "@/features/chat/components/unified-chat-interface";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { canAccessOrganizationChat } from "@/lib/rbac/rbac";
import { getCachedAgentConfig } from "@/server/cache/organization.cache";
import { getCachedUserProjects } from "@/server/cache/project.cache";
import { AlertCircle } from "lucide-react";
import { redirect } from "next/navigation";

async function ChatPageContent() {
  // Get session with roles
  const sessionResult = await getBetterAuthSession();

  if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
    redirect("/api/auth/login");
  }

  const session = sessionResult.value;

  if (!session.user) {
    redirect("/api/auth/login");
  }

  // Check if user is admin
  const isAdmin = canAccessOrganizationChat(session.user);

  // Get user's projects (cached)
  const projects = session.organization
    ? await getCachedUserProjects(session.organization.id)
    : [];

  // Check if agent is enabled
  const agentEnabled = session.organization
    ? await getCachedAgentConfig(session.organization.id)
    : true;

  // If no projects and not admin, show error
  if (projects.length === 0 && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="max-w-md w-full p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">No Projects Available</h2>
              <p className="text-muted-foreground">
                You don't have access to any projects yet. Please create a
                project or contact your organization administrator for access.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <UnifiedChatInterface
        isAdmin={isAdmin}
        projects={projects}
        defaultContext={isAdmin ? "organization" : "project"}
        defaultProjectId={projects[0]?.id}
        agentEnabled={agentEnabled}
        organizationName={session.organization?.name}
      />
    </div>
  );
}

export default function OrganizationChatPage() {
  return (
    <ProtectedPage>
      <ChatPageContent />
    </ProtectedPage>
  );
}

