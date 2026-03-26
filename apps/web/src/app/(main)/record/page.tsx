import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InfoIcon } from "lucide-react";

import { ProtectedPage } from "@/components/protected-page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RecordPage as NewRecordPage } from "@/features/recordings/components/record-page";
import type { AuthContext } from "@/lib/auth-context";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import type { ProjectWithCreatorDto } from "@/server/dto/project.dto";
import { ProjectService } from "@/server/services/project.service";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Record" };

interface RecordPageContentProps {
  searchParamsPromise: Promise<{ projectId?: string }>;
}

async function RecordPageContent({
  searchParamsPromise,
}: RecordPageContentProps) {
  const { projectId: projectIdParam } = await searchParamsPromise;
  const authResult = await getBetterAuthSession();
  const t = await getTranslations("recordings");

  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    return (
      <div className="text-center">
        <p className="text-red-500">{t("page.authRequired")}</p>
      </div>
    );
  }

  const { user, organization } = authResult.value;

  if (!user || !organization) {
    return (
      <div className="text-center">
        <p className="text-red-500">{t("page.userOrOrgNotFound")}</p>
      </div>
    );
  }

  if (!organization.id) {
    return (
      <div className="text-center">
        <p className="text-red-500">{t("page.orgCodeNotFound")}</p>
      </div>
    );
  }

  const auth: AuthContext = {
    user,
    organizationId: organization.id,
    userTeamIds: authResult.value.userTeamIds ?? [],
  };

  // Fetch active projects for this organization
  const projectsResult = await ProjectService.getProjectsByOrganization(auth, {
    organizationId: organization.id,
    status: "active",
  });

  if (projectsResult.isErr()) {
    return (
      <div className="text-center">
        <p className="text-red-500">{t("page.failedToLoadProjects")}</p>
      </div>
    );
  }

  const projects = projectsResult.value;
  const projectIdFromParams =
    projectIdParam &&
    projects.some((p: ProjectWithCreatorDto) => p.id === projectIdParam)
      ? projectIdParam
      : undefined;

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("page.recordMeeting")}</h1>
          <p className="text-muted-foreground">
            {t("page.recordMeetingDescription")}
          </p>
        </div>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">{t("page.noProjectsFound")}</p>
            <p className="text-sm">{t("page.noProjectsDescription")}</p>
            <Link
              href="/projects/create"
              className="text-sm font-medium text-primary hover:underline mt-2 inline-block"
            >
              {t("page.createFirstProject")} →
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <NewRecordPage
      projects={projects}
      organizationId={organization.id}
      userId={user.id}
      projectIdFromParams={projectIdFromParams}
    />
  );
}

interface RecordPageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default function RecordPage({ searchParams }: RecordPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl py-8 px-4">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <ProtectedPage>
        <div className="container mx-auto max-w-7xl py-8 px-4">
          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
                <div className="h-64 bg-muted rounded animate-pulse" />
              </div>
            }
          >
            <RecordPageContent searchParamsPromise={searchParams} />
          </Suspense>
        </div>
      </ProtectedPage>
    </Suspense>
  );
}
