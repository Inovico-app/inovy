import { CalendarIcon, UserIcon } from "lucide-react";
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
import { UploadRecordingModal } from "../../../components/recordings/upload-recording-modal";
import { RecordingList } from "../../../components/recordings/recording-list";
import { ProjectService } from "../../../server/services/project.service";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string }>;
}

async function ProjectDetail({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const { search } = await searchParams;

  const projectResult = await ProjectService.getProjectById(id);

  if (projectResult.isErr()) {
    notFound();
  }

  const project = projectResult.value;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}/upload` as Route}>
                Upload Page
              </Link>
            </Button>
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

