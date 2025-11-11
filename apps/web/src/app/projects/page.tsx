import { AuthService } from "@/lib/kinde-api";
import { logger } from "@/lib/logger";
import { CalendarIcon, FileTextIcon, FolderIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ProjectSearch } from "../../features/projects/components/project-search";
import { ProjectTabs } from "../../features/projects/components/project-tabs";
import type { AllowedStatus } from "../../server/data-access/projects.queries";
import { ProjectService } from "../../server/services/project.service";

interface ProjectsListProps {
  searchQuery?: string;
  status?: AllowedStatus;
}

const getCreatorName = async (createdById: string) => {
  try {
    const Users = await AuthService.getUsers();
    const response = await Users.getUserData({
      id: createdById,
    });

    if (!response) {
      return "Unknown Creator";
    }

    const given_name = response.first_name || null;
    const family_name = response.last_name || null;

    if (given_name && family_name) {
      return `${given_name} ${family_name}`;
    }
    if (given_name) {
      return given_name;
    }
    if (family_name) {
      return family_name;
    }
    return "Unknown Creator";
  } catch (error) {
    logger.warn("Failed to fetch creator details", {
      createdById,
      error,
    });
    return "Unknown Creator";
  }
};

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

  let projects = projectsResult.value;

  // Filter projects by search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    projects = projects.filter((project) =>
      project.name.toLowerCase().includes(query)
    );
  }

  const projectsWithCreators = await Promise.all(
    projects.map(async (project) => ({
      ...project,
      createdBy: await getCreatorName(project.createdById),
    }))
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      {/* Projects Grid */}
      {projectsWithCreators.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projectsWithCreators.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <Link href={`/projects/${project.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{project.name}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full capitalize ${
                        project.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                      }`}
                    >
                      {project.status}
                    </span>
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
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      Created {formatDate(project.createdAt)}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <FileTextIcon className="h-3 w-3 mr-1" />
                      By {project.createdBy}
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
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
              <Button asChild>
                <Link href="/projects/create">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Link>
              </Button>
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
          <Button asChild>
            <Link href="/projects/create">
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Project
            </Link>
          </Button>
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
                <div key={i} className="h-48 bg-muted rounded animate-pulse" />
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

