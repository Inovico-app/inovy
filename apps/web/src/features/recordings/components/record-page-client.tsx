"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { RecordingErrorBoundary } from "@/components/recording-error-boundary";
import { LiveRecorder } from "@/features/recordings/components/live-recorder/live-recorder";
import { RecordPageSidebar } from "@/features/recordings/components/record-page-sidebar";
import { RecordingSettingsSidebar } from "@/features/recordings/components/recording-settings-sidebar";
import { convertBlobToMp3 } from "@/features/recordings/lib/audio-utils";
import { useRecordingPreferences } from "@/features/recordings/hooks/use-recording-preferences";
import { uploadRecordingToBlob } from "@/lib/vercel-blob";
import type { ProjectWithCreatorDto } from "@/server/dto/project.dto";
import { InfoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface RecordPageClientProps {
  projects: ProjectWithCreatorDto[];
}

export function RecordPageClient({ projects }: RecordPageClientProps) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id ?? ""
  );
  const [isRecording, setIsRecording] = useState(false);

  const {
    autoProcessEnabled,
    liveTranscriptionEnabled,
    isSavingPreference,
    handleToggleAutoProcess,
    handleToggleTranscription,
  } = useRecordingPreferences();

  const handleLiveRecordingComplete = async (
    audioBlob: Blob,
    _transcription: string
  ) => {
    if (!selectedProjectId) {
      toast.error("Selecteer eerst een project");
      return;
    }

    try {
      const audioFile = await convertBlobToMp3(
        audioBlob,
        `live-recording-${Date.now()}`
      );

      // Prepare metadata to send with the upload
      const clientPayload = JSON.stringify({
        projectId: selectedProjectId,
        title: `Live opname ${new Date().toLocaleString("nl-NL")}`,
        description: "Live opgenomen gesprek",
        recordingDate: new Date().toISOString(),
        recordingMode: "live",
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileMimeType: audioFile.type,
      });

      // Upload directly to Vercel Blob using the client upload pattern
      await uploadRecordingToBlob(audioFile, {
        clientPayload,
      });

      router.push(`/projects/${selectedProjectId}`);
      router.refresh();
    } catch (error) {
      console.error("Error saving live recording:", error);
      toast.error(
        error instanceof Error ? error.message : "Fout bij opslaan van opname"
      );
    }
  };

  return (
    <RecordingErrorBoundary>
      <div className="space-y-6">
        {/* Header - Full width */}
        <div className="pb-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Record Meeting
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Record audio directly from your browser with live transcription
          </p>
        </div>

        {/* Main Content Area with Sidebars - Aligned vertically */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Recording and Transcription Containers */}
          <div className="flex-1 min-w-0">
            {selectedProjectId ? (
              <LiveRecorder
                onRecordingComplete={handleLiveRecordingComplete}
                liveTranscriptionEnabled={liveTranscriptionEnabled}
                onTranscriptionToggle={handleToggleTranscription}
                onRecordingStateChange={setIsRecording}
              />
            ) : (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  Selecteer een project om te beginnen met opnemen
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Sidebars - Right side, aligned with recording containers */}
          <div className="flex flex-col xl:flex-col gap-4 xl:w-80 xl:flex-shrink-0">
            {/* Project Settings Sidebar */}
            <RecordPageSidebar
              projects={projects}
              selectedProjectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
            />

            {/* Recording Settings Sidebar */}
            <RecordingSettingsSidebar
              liveTranscriptionEnabled={liveTranscriptionEnabled}
              onTranscriptionToggle={handleToggleTranscription}
              autoProcessEnabled={autoProcessEnabled}
              onAutoProcessToggle={handleToggleAutoProcess}
              isRecording={isRecording}
              isSavingPreference={isSavingPreference}
            />
          </div>
        </div>
      </div>
    </RecordingErrorBoundary>
  );
}
