import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProjectKnowledgeBaseSection } from "@/features/knowledge-base/components/project-knowledge-base-section";
import { EditProjectForm } from "@/features/projects/components/edit-project-form";
import { ProjectTemplateSection } from "@/features/projects/components/project-templates/project-template-section";
import { resolveAuthContext } from "@/lib/auth-context";
import { hasRole } from "@/lib/permissions/predicates";
import type { Role } from "@/lib/permissions/types";
import {
  getCachedHierarchicalKnowledge,
  getCachedKnowledgeDocuments,
  getCachedKnowledgeEntries,
} from "@/server/cache/knowledge-base.cache";
import { ProjectService } from "@/server/services/project.service";

interface ProjectSettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({
  params,
}: ProjectSettingsPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const authResult = await resolveAuthContext("ProjectSettings.metadata");
  if (authResult.isOk()) {
    const project = await ProjectService.getProjectById(
      projectId,
      authResult.value,
    );
    if (project.isOk()) {
      return { title: `${project.value.name} Settings` };
    }
  }
  return { title: "Project Settings" };
}
import {
  ArrowLeftIcon,
  FileTextIcon,
  SettingsIcon,
  SparklesIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface ProjectSettingsPageProps {
  params: Promise<{ projectId: string }>;
}

async function ProjectSettings({ params }: ProjectSettingsPageProps) {
  const { projectId } = await params;

  const authResult = await resolveAuthContext("ProjectSettings");
  if (authResult.isErr()) {
    notFound();
  }

  const projectResult = await ProjectService.getProjectById(
    projectId,
    authResult.value,
  );

  if (projectResult.isErr() || !projectResult.value) {
    notFound();
  }

  const project = projectResult.value;
  const t = await getTranslations("projects");
  const { member } = authResult.value;
  const canEdit = member
    ? hasRole("manager").check({
        role: member.role as Role,
        userId: member.userId,
      })
    : hasRole("manager").check({
        role: authResult.value.user.role as Role,
        userId: authResult.value.user.id,
      });

  const [projectEntries, projectDocuments, hierarchicalEntries] =
    await Promise.all([
      getCachedKnowledgeEntries("project", projectId),
      getCachedKnowledgeDocuments("project", projectId),
      getCachedHierarchicalKnowledge(projectId, project.organizationId),
    ]);

  return (
    <div className="container mx-auto py-6 px-4 sm:py-10 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/projects/${projectId}`}
            className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            {t("backToProject")}
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {project.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("settingsTitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Project Details Section */}
          {canEdit && (
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileTextIcon className="h-4.5 w-4.5 text-muted-foreground" />
                    {t("projectDetails")}
                  </CardTitle>
                  <CardDescription>
                    {t("projectDetailsDescription")}
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                  <EditProjectForm
                    projectId={projectId}
                    initialData={{
                      name: project.name,
                      description: project.description,
                      teamId: project.teamId,
                    }}
                  />
                </CardContent>
              </Card>
            </section>
          )}

          {/* Project Templates Section */}
          <section>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <SparklesIcon className="h-4.5 w-4.5 text-muted-foreground" />
                      {t("projectTemplates")}
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      {t("projectTemplatesDescription")}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    AI
                  </Badge>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <Suspense fallback={<TemplateLoadingSkeleton />}>
                  <ProjectTemplateSection projectId={projectId} />
                </Suspense>
              </CardContent>
            </Card>
          </section>

          {/* Knowledge Base Section */}
          <section>
            <ProjectKnowledgeBaseSection
              initialProjectEntries={projectEntries}
              initialProjectDocuments={projectDocuments}
              initialHierarchicalEntries={hierarchicalEntries}
              projectId={projectId}
              organizationId={project.organizationId}
              canEdit={canEdit}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function TemplateLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
      <div className="h-24 bg-muted rounded-lg animate-pulse" />
      <div className="flex gap-2">
        <div className="h-9 w-28 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="container mx-auto py-6 px-4 sm:py-10 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="h-4 w-24 bg-muted rounded animate-pulse mb-4" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-muted rounded-lg animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="space-y-8">
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
          <div className="h-48 bg-muted rounded-xl animate-pulse" />
          <div className="h-72 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default async function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps) {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <ProjectSettings params={params} />
    </Suspense>
  );
}
