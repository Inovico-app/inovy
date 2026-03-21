import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectModal } from "@/features/projects/components/create-project-modal";

export const metadata: Metadata = { title: "Projects" };
import { ProjectSearch } from "@/features/projects/components/project-search";
import { ProjectTabs } from "@/features/projects/components/project-tabs";
import { formatDateShort } from "@/lib/formatters/date-formatters";
import { getCreatorDisplayName } from "@/lib/formatters/display-formatters";
import { filterProjectsBySearch } from "@/lib/filters/project-filters";
import type { AllowedStatus } from "@/server/data-access/projects.queries";
import type { ProjectWithRecordingCountDto } from "@/server/dto/project.dto";
import { ProjectService } from "@/server/services/project.service";
import { getCachedTeamsWithMemberCounts } from "@/server/cache/team.cache";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import {
  CalendarIcon,
  FileTextIcon,
  FolderIcon,
  GlobeIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

interface ProjectsListProps {
  searchQuery?: string;
  status?: AllowedStatus;
}

async function ProjectsList({
  searchQuery,
  status = "active",
}: ProjectsListProps) {
  const projectsResult =
    await ProjectService.getProjectsByOrganizationWithRecordingCount(status);

  if (projectsResult.isErr()) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-red-500">
            Failed to load projects:{" "}
            {projectsResult.error?.message ?? "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  // Filter projects by search query
  const projects = filterProjectsBySearch(projectsResult.value, searchQuery);

  // Resolve team names
  const authResult = await getBetterAuthSession();
  const orgId = authResult.isOk() ? authResult.value.organization?.id : null;
  const teamsData = orgId ? await getCachedTeamsWithMemberCounts(orgId) : [];
  const teamNameMap = new Map(teamsData.map((t) => [t.id, t.name]));

  // Creator details are already included via JOIN, no need to fetch separately
  const projectsWithCreators = projects.map((project) => ({
    ...project,
    createdBy: getCreatorDisplayName(project.creatorName, project.creatorEmail),
    teamName: project.teamId ? (teamNameMap.get(project.teamId) ?? null) : null,
  }));

  return (
    <>
      {/* Projects Grid */}
      {projectsWithCreators.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projectsWithCreators.map(
            (
              project: ProjectWithRecordingCountDto & {
                createdBy: string;
                teamName: string | null;
              },
            ) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <Link href={`/projects/${project.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="truncate">{project.name}</span>
                      {project.teamName ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary shrink-0">
                          <UsersIcon className="h-3 w-3" />
                          {project.teamName}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground shrink-0">
                          <GlobeIcon className="h-3 w-3" />
                          Everyone
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {project.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <FolderIcon className="h-3 w-3 mr-1" />
                        {project.recordingCount}{" "}
                        {project.recordingCount === 1
                          ? "recording"
                          : "recordings"}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <FileTextIcon className="h-3 w-3 mr-1" />
                        By {project.createdBy}
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ),
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery
                ? "No projects found"
                : status === "archived"
                  ? "No archived projects"
                  : "No projects yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Try adjusting your search criteria."
                : status === "archived"
                  ? "Projects you archive will appear here."
                  : "Create your first project to start organizing your meeting recordings."}
            </p>
            {!searchQuery && status === "active" && (
              <CreateProjectModal
                trigger={
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Your First Project
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

async function ProjectsPageContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ search?: string; status?: string }>;
}) {
  const { search, status } = await searchParamsPromise;
  const projectStatus = (
    status === "archived" ? "archived" : "active"
  ) as AllowedStatus;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-2">
              Organize your meeting recordings by project
            </p>
          </div>
          <CreateProjectModal />
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <ProjectTabs />
        </div>

        {/* Search */}
        <div className="mb-6">
          <ProjectSearch />
        </div>

        {/* Projects List */}
        <ProjectsList searchQuery={search} status={projectStatus} />
      </div>
    </div>
  );
}

interface ProjectsPageProps {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export default function ProjectsPage({ searchParams }: ProjectsPageProps) {
  // CACHE COMPONENTS: Wrap dynamic content in Suspense to enable static shell generation
  // ProjectsList accesses auth data to get projects, making it dynamic
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="h-48 bg-muted rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ProjectsPageContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
