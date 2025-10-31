import {
  ActivityIcon,
  CalendarIcon,
  ClockIcon,
  FolderIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { Suspense } from "react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { UploadRecordingModal } from "../../../features/recordings/components/upload-recording-modal";
import { RecordingList } from "../../../features/recordings/components/recording-list";
import { ProjectService } from "../../../server/services/project.service";
import { RecordingService } from "../../../server/services/recording.service";
import { EditProjectModal } from "../../../features/projects/components/edit-project-modal";
import { ArchiveProjectDialog } from "../../../features/projects/components/archive-project-dialog";
import { DeleteProjectDialog } from "../../../features/projects/components/delete-project-dialog";

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ search?: string }>;
}

async function ProjectDetail({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { projectId } = await params;
  const { search } = await searchParams;

  const projectResult = await ProjectService.getProjectById(projectId);

  if (projectResult.isErr()) {
    notFound();
  }

  const project = projectResult.value;

  // Get recording statistics
  const statisticsResult =
    await RecordingService.getProjectRecordingStatistics(projectId);
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
    if (!date) return "Never";

    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
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
          <div className="flex gap-2">
            <EditProjectModal
              projectId={project.id}
              initialData={{
                name: project.name,
                description: project.description,
              }}
              variant="outline"
            />
            <ArchiveProjectDialog
              projectId={project.id}
              projectName={project.name}
              isArchived={project.status === "archived"}
              variant="outline"
            />
            <DeleteProjectDialog
              projectId={project.id}
              projectName={project.name}
              recordingCount={statistics.totalCount}
              variant="outline"
            />
            <UploadRecordingModal projectId={project.id} />
          </div>
        </div>

        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Created:</span>
                <span className="text-sm">{formatDate(project.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Created by:
                </span>
                <span className="text-sm">{getCreatorName()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Status:</span>
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
            <CardTitle>Project Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <FolderIcon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Recordings
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
                    Recent Activity
                  </p>
                  <p className="text-2xl font-bold">{statistics.recentCount}</p>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <ClockIcon className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Last Recording
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

        {/* Recordings Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recordings</CardTitle>
            <UploadRecordingModal projectId={project.id} />
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              }
            >
              <RecordingList projectId={project.id} searchQuery={search} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/projects">← Back to Projects</Link>
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

