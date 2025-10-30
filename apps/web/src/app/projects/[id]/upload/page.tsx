import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UploadRecordingForm } from "@/features/recordings/components/upload-recording-form";
import { ProjectService } from "@/server/services";
import { ArrowLeftIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface UploadRecordingPageProps {
  params: Promise<{ id: string }>;
}

async function UploadRecordingContent({ params }: UploadRecordingPageProps) {
  const { id } = await params;

  // Verify project exists
  const projectResult = await ProjectService.getProjectById(id);

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
            <Link href={`/projects/${id}` as Route}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Project
            </Link>
          </Button>

          <h1 className="text-3xl font-bold">Upload Recording</h1>
          <p className="text-muted-foreground mt-2">
            Upload a meeting recording to {project.name}
          </p>
        </div>

        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle>Recording Details</CardTitle>
            <CardDescription>
              Upload an audio or video recording and provide details about the
              meeting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadRecordingForm projectId={id} />
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supported Formats</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>MP3 audio files (.mp3)</li>
              <li>MP4 audio/video files (.mp4)</li>
              <li>WAV audio files (.wav)</li>
              <li>M4A audio files (.m4a)</li>
              <li>Maximum file size: 100MB</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">
              After uploading, your recording will be processed for
              transcription and AI-powered analysis to extract action items and
              summaries.
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

