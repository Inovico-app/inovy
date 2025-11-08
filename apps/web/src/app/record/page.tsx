import { ProtectedPage } from "@/components/protected-page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getAuthSession } from "@/lib/auth";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import { InfoIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { RecordPageClient } from "./record-page-client";

async function RecordPageContent() {
  const authResult = await getAuthSession();

  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    return (
      <div className="text-center">
        <p className="text-red-500">Authentication required</p>
      </div>
    );
  }

  const { user, organization } = authResult.value;

  if (!user || !organization) {
    return (
      <div className="text-center">
        <p className="text-red-500">User or organization not found</p>
      </div>
    );
  }

  if (!organization.orgCode) {
    return (
      <div className="text-center">
        <p className="text-red-500">Organization code not found</p>
      </div>
    );
  }

  // Fetch active projects for this organization
  const projects = await ProjectQueries.findByOrganizationWithCreator({
    organizationId: organization.orgCode,
    status: "active",
  });

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Record Meeting</h1>
          <p className="text-muted-foreground">
            Record audio directly from your browser with live transcription
          </p>
        </div>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">No projects found</p>
            <p className="text-sm">
              You need to create a project first before you can record. Projects
              help organize your recordings.
            </p>
            <Link
              href="/projects/create"
              className="text-sm font-medium text-primary hover:underline mt-2 inline-block"
            >
              Create your first project →
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <RecordPageClient projects={projects} />;
}

export default function RecordPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-4xl py-8 px-4">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <ProtectedPage>
        <div className="container mx-auto max-w-4xl py-8 px-4">
          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
                <div className="h-64 bg-muted rounded animate-pulse" />
              </div>
            }
          >
            <RecordPageContent />
          </Suspense>
        </div>
      </ProtectedPage>
    </Suspense>
  );
}

