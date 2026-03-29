import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: UploadRecordingPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const authResult = await resolveAuthContext("UploadRecording.metadata");
  if (authResult.isOk()) {
    const project = await ProjectService.getProjectById(
      projectId,
      authResult.value,
    );
    if (project.isOk()) {
      return { title: `Upload Recording - ${project.value.name}` };
    }
  }
  return { title: "Upload Recording" };
}
import { resolveAuthContext } from "@/lib/auth-context";
import { ProjectService } from "@/server/services/project.service";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface UploadRecordingPageProps {
  params: Promise<{ projectId: string }>;
}

async function UploadRecordingContent({ params }: UploadRecordingPageProps) {
  const { projectId } = await params;

  const authResult = await resolveAuthContext("UploadRecording");
  if (authResult.isErr()) {
    notFound();
  }

  // Verify project exists
  const projectResult = await ProjectService.getProjectById(
    projectId,
    authResult.value,
  );

  if (projectResult.isErr() || !projectResult.value) {
    notFound();
  }

  const project = projectResult.value;
  const t = await getTranslations("projects");
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            render={<Link href={`/projects/${projectId}` as Route} />}
            nativeButton={false}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {t("backToProject")}
          </Button>

          <h1 className="text-3xl font-bold">{t("uploadRecording")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("uploadSubtitle", { name: project.name })}
          </p>
        </div>

        {/* Help Text */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("supportedFormats")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t("formatMp3")}</li>
              <li>{t("formatMp4")}</li>
              <li>{t("formatWav")}</li>
              <li>{t("formatM4a")}</li>
              <li>{t("maxFileSize")}</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">
              Na het uploaden wordt je opname automatisch getranscribeerd met
              AI-analyse om actiepunten en samenvattingen te genereren.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function UploadRecordingPage({
  params,
}: UploadRecordingPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-96 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <UploadRecordingContent params={params} />
    </Suspense>
  );
}
