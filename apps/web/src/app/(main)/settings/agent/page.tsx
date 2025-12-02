import { KnowledgeBaseBrowser } from "@/features/agent/components/knowledge-base-browser";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { getCachedUserProjects } from "@/server/cache/project.cache";
import { Suspense } from "react";

async function AgentContent() {
  const authResult = await getAuthSession();

  if (authResult.isErr() || !authResult.value.organization) {
    return (
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <div className="text-center">
          <p className="text-red-500">
            Failed to load organization information
          </p>
        </div>
      </div>
    );
  }

  const organization = authResult.value.organization;
  const organizationId = organization.id;

  // Fetch projects for filtering
  const projects = await getCachedUserProjects();

  return (
    <div className="container mx-auto max-w-6xl py-12 px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Knowledge Base Browser</h1>
        <p className="text-muted-foreground mt-2">
          Browse and manage indexed documents in your knowledge base
        </p>
      </div>

      {/* Knowledge Base Browser */}
      <KnowledgeBaseBrowser
        organizationId={organizationId}
        projects={projects}
      />
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-8 px-4">
          <div className="space-y-8">
            <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <AgentContent />
    </Suspense>
  );
}

