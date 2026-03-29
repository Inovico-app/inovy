import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const authResult = await resolveAuthContext("ProjectDetail.metadata");
  if (authResult.isOk()) {
    const project = await ProjectService.getProjectById(
      projectId,
      authResult.value,
    );
    if (project.isOk()) {
      return { title: project.value.name };
    }
  }
  return { title: "Project" };
}
import { ProjectKnowledgeContextCard } from "@/features/knowledge-base/components/project-knowledge-context-card";
import { ProjectActions } from "@/features/projects/components/project-actions";
import { RecordingList } from "@/features/recordings/components/recording-list";
import { resolveAuthContext } from "@/lib/auth-context";
import { getCachedKnowledgeDocuments } from "@/server/cache/knowledge-base.cache";
import { ProjectService } from "@/server/services/project.service";
import { RecordingService } from "@/server/services/recording.service";
import { differenceInCalendarDays } from "date-fns";
import {
  ActivityIcon,
  CalendarIcon,
  ClockIcon,
  FolderIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ search?: string }>;
}

/**
 * Render the project detail page for a given project ID.
 *
 * Fetches the project and its recording statistics, and renders the project's
 * header, information, statistics, recordings list, and action controls. If the
 * project cannot be found, triggers the framework's not-found behavior.
 *
 * @param params - Promise resolving to route params containing `projectId`
 * @param searchParams - Promise resolving to query params containing optional `search`
 * @returns A React element containing project details, statistics, recordings list, and actions
 */
async function ProjectDetail({ params, searchParams }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const { search } = await searchParams;

  const t = await getTranslations("projects");

  const authResult = await resolveAuthContext("ProjectDetail");
  if (authResult.isErr()) {
    notFound();
  }

  const [projectResult, statisticsResult, projectDocuments, orgDocuments] =
    await Promise.all([
      ProjectService.getProjectById(projectId, authResult.value),
      RecordingService.getProjectRecordingStatistics(projectId),
      getCachedKnowledgeDocuments("project", projectId),
      getCachedKnowledgeDocuments(
        "organization",
        authResult.value.organizationId,
      ),
    ]);

  if (projectResult.isErr()) {
    notFound();
  }

  const project = projectResult.value;
  const isArchived = project.status === "archived";

  const statistics = statisticsResult.isOk()
    ? statisticsResult.value
    : { totalCount: 0, lastRecordingDate: null, recentCount: 0 };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatRelativeTime = (date: Date | null) => {
    if (!date) return t("never");

    const now = new Date();
    const diffInDays = differenceInCalendarDays(now, date);

    if (diffInDays === 0) return t("today");
    if (diffInDays === 1) return t("yesterday");
    if (diffInDays < 7) return t("daysAgo", { count: diffInDays });
    if (diffInDays < 30)
      return t("weeksAgo", { count: Math.floor(diffInDays / 7) });
    if (diffInDays < 365)
      return t("monthsAgo", { count: Math.floor(diffInDays / 30) });
    return t("yearsAgo", { count: Math.floor(diffInDays / 365) });
  };

  const getCreatorName = () => {
    const { givenName, familyName } = project.createdBy;
    if (givenName && familyName) {
      return `${givenName} ${familyName}`;
    }
    if (givenName) {
      return givenName;
    }
    return project.createdBy.email;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-lg text-muted-foreground mt-2">
                {project.description}
              </p>
            )}
          </div>
          <ProjectActions
            projectId={project.id}
            projectName={project.name}
            projectDescription={project.description}
            isArchived={isArchived}
            recordingCount={statistics.totalCount}
          />
        </div>

        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("projectInformation")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t("created")}
                </span>
                <span className="text-sm">{formatDate(project.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t("createdByLabel")}
                </span>
                <span className="text-sm">{getCreatorName()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {t("statusLabel")}
              </span>
              <span
                className={`text-sm px-2 py-1 rounded-full capitalize ${
                  project.status === "active"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                }`}
              >
                {project.status}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Project Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>{t("projectStatistics")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <FolderIcon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("totalRecordings")}
                  </p>
                  <p className="text-2xl font-bold">{statistics.totalCount}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <ActivityIcon className="h-5 w-5 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("recentActivity")}
                  </p>
                  <p className="text-2xl font-bold">{statistics.recentCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("lastSevenDays")}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <ClockIcon className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("lastRecording")}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatRelativeTime(statistics.lastRecordingDate)}
                  </p>
                  {statistics.lastRecordingDate && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(statistics.lastRecordingDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Context */}
        <ProjectKnowledgeContextCard
          projectDocumentCount={projectDocuments.length}
          orgDocumentCount={orgDocuments.length}
          projectId={project.id}
        />

        {/* Recordings Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recordings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={`skeleton-${i}`} className="h-32 w-full" />
                  ))}
                </div>
              }
            >
              <RecordingList
                projectId={project.id}
                organizationId={project.organizationId}
                searchQuery={search}
                isArchived={isArchived}
              />
            </Suspense>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            render={<Link href="/projects" />}
            nativeButton={false}
          >
            ← Back to Projects
          </Button>
        </div>
      </div>
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  // CACHE COMPONENTS: Wrap dynamic content in Suspense to enable static shell generation
  // ProjectDetail accesses project data from the database, making it dynamic
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-48 bg-muted rounded animate-pulse" />
            <div className="h-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <ProjectDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}
