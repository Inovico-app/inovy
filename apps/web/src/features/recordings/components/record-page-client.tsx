"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LiveRecorder } from "@/features/recordings/components/live-recorder/live-recorder";
import { MeetingSettingsMenu } from "@/features/recordings/components/meeting-settings-menu";
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
  projectIdFromParams?: string;
}

export function RecordPageClient({
  projects,
  projectIdFromParams,
}: RecordPageClientProps) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id ?? ""
  );
  const showProjectSelector = projectIdFromParams === undefined;
  const effectiveProjectId = projectIdFromParams ?? selectedProjectId;
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
    _transcription: string,
    consentGranted: boolean,
    consentGrantedAt: Date
  ) => {
    if (!effectiveProjectId) {
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
        projectId: effectiveProjectId,
        title: `Live opname ${new Date().toLocaleString("nl-NL")}`,
        description: "Live opgenomen gesprek",
        recordingDate: new Date().toISOString(),
        recordingMode: "live",
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileMimeType: audioFile.type,
        consentGiven: consentGranted,
        consentGivenAt: consentGranted ? consentGrantedAt.toISOString() : undefined,
      });

      // Upload directly to Vercel Blob using the client upload pattern
      await uploadRecordingToBlob(audioFile, {
        clientPayload,
      });

      router.push(`/projects/${effectiveProjectId}`);
      router.refresh();
    } catch (error) {
      console.error("Error saving live recording:", error);
      toast.error(
        error instanceof Error ? error.message : "Fout bij opslaan van opname"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - Full width with title, optional project selector, and settings */}
      <div className="pb-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Record Meeting
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Record audio directly from your browser with live transcription
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {showProjectSelector && (
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger
                id="project-select"
                className="w-[200px] sm:w-[240px]"
              >
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium leading-tight">
                        {project.name}
                      </span>
                      {project.description && (
                        <span className="text-muted-foreground text-xs leading-tight">
                          {project.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <MeetingSettingsMenu
            liveTranscriptionEnabled={liveTranscriptionEnabled}
            onTranscriptionToggle={handleToggleTranscription}
            autoProcessEnabled={autoProcessEnabled}
            onAutoProcessToggle={handleToggleAutoProcess}
            isRecording={isRecording}
            isSavingPreference={isSavingPreference}
          />
        </div>
      </div>

      {/* Main Content - Recording and Transcription (2 columns) */}
      <div className="flex-1 min-w-0">
        {effectiveProjectId ? (
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
    </div>
  );
}
