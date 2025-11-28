import { ProtectedPage } from "@/components/protected-page";
import { Card } from "@/components/ui/card";
import { UnifiedChatInterface } from "@/features/chat/components/unified-chat-interface";
import { getUserProjects } from "@/features/projects/actions/get-user-projects";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { canAccessOrganizationChat } from "@/lib/rbac/rbac";
import { AlertCircle, Loader2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function ChatPageContent() {
  // Get session with roles
  const sessionResult = await getAuthSession();

  if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
    redirect("/api/auth/login");
  }

  const session = sessionResult.value;

  if (!session.user) {
    redirect("/api/auth/login");
  }

  // Check if user is admin
  const isAdmin = canAccessOrganizationChat(session.user);

  // Get user's projects
  const projectsResult = await getUserProjects();
  const projects = projectsResult.success ? (projectsResult.data ?? []) : [];

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
      />
    </div>
  );
}

export default function OrganizationChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading organization chat...
            </p>
          </div>
        </div>
      }
    >
      <ProtectedPage>
        <ChatPageContent />
      </ProtectedPage>
    </Suspense>
  );
}

