import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectTemplateSection } from "@/features/projects/components/project-templates/project-template-section";
import { ProjectService } from "@/server/services/project.service";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface ProjectSettingsPageProps {
  params: Promise<{ projectId: string }>;
}

async function ProjectSettings({ params }: ProjectSettingsPageProps) {
  const { projectId } = await params;

  // Verify project exists and user has access
  const projectResult = await ProjectService.getProjectById(projectId);

  if (projectResult.isErr()) {
    notFound();
  }

  const project = projectResult.value;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Project
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">
                {project.name} - Settings
              </h1>
            </div>
          </div>
        </div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Project Templates Section */}
          <Card>
            <CardHeader>
              <CardTitle>Project Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Define project-specific guidelines that will be included in AI
                responses. These instructions will help shape how the AI
                assistant responds to queries about this project.
              </p>
              <Suspense fallback={<TemplateLoadingSkeleton />}>
                <ProjectTemplateSection projectId={projectId} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TemplateLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 bg-muted rounded animate-pulse" />
      <div className="h-32 bg-muted rounded animate-pulse" />
    </div>
  );
}

export default async function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-96 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <ProjectSettings params={params} />
    </Suspense>
  );
}

