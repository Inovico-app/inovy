import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectService } from "@/server/services/project.service";
import { ArrowLeftIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface UploadRecordingPageProps {
  params: Promise<{ projectId: string }>;
}

async function UploadRecordingContent({ params }: UploadRecordingPageProps) {
  const { projectId } = await params;

  // Verify project exists
  const projectResult = await ProjectService.getProjectById(projectId);

  if (projectResult.isErr() || !projectResult.value) {
    notFound();
  }

  const project = projectResult.value;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href={`/projects/${projectId}` as Route}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Project
            </Link>
          </Button>

          <h1 className="text-3xl font-bold">Opname toevoegen</h1>
          <p className="text-muted-foreground mt-2">
            Upload een bestand of neem live op voor {project.name}
          </p>
        </div>

        {/* Help Text */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ondersteunde formaten</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>MP3 audio bestanden (.mp3)</li>
              <li>MP4 audio/video bestanden (.mp4)</li>
              <li>WAV audio bestanden (.wav)</li>
              <li>M4A audio bestanden (.m4a)</li>
              <li>Maximale bestandsgrootte: 100MB</li>
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

