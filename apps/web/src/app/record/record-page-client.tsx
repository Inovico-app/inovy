"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LiveRecorder } from "@/features/recordings/components/live-recorder";
import { getAutoProcessPreferenceClient } from "@/lib/recording-preferences";
import type { ProjectWithCreatorDto } from "@/server/dto/project.dto";
import { put } from "@vercel/blob";
import { FolderIcon, InfoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface RecordPageClientProps {
  projects: ProjectWithCreatorDto[];
}

export function RecordPageClient({ projects }: RecordPageClientProps) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id ?? ""
  );
  const [autoProcessEnabled, setAutoProcessEnabled] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Check auto-process preference on mount
  useEffect(() => {
    try {
      const preference = getAutoProcessPreferenceClient();
      setAutoProcessEnabled(preference);
    } catch (error) {
      console.error("Failed to check auto-process preference:", error);
    }
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleLiveRecordingComplete = async (
    audioBlob: Blob,
    _transcription: string
  ) => {
    if (!selectedProjectId) {
      toast.error("Selecteer eerst een project");
      return;
    }

    try {
      setIsUploading(true);

      // Convert blob to file
      const audioFile = new File(
        [audioBlob],
        `live-recording-${Date.now()}.webm`,
        { type: "audio/webm" }
      );

      // Upload to Vercel Blob
      await put(`recordings/${audioFile.name}`, audioFile, {
        access: "public",
      });

      // Create form data
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("projectId", selectedProjectId);
      formData.append(
        "title",
        `Live opname ${new Date().toLocaleString("nl-NL")}`
      );
      formData.append("description", "Live opgenomen gesprek");
      formData.append("recordingDate", new Date().toISOString());
      formData.append("recordingMode", "live");

      // Upload recording via API route
      const response = await fetch("/api/recordings/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Fout bij opslaan van opname",
        }));
        throw new Error(errorData.error ?? "Fout bij opslaan van opname");
      }

      const result = await response.json();

      if (result.success && result.recordingId) {
        toast.success("Opname succesvol opgeslagen!");
        router.push(
          `/projects/${selectedProjectId}/recordings/${result.recordingId}`
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Fout bij opslaan van opname");
      }
    } catch (error) {
      console.error("Error saving live recording:", error);
      toast.error(
        error instanceof Error ? error.message : "Fout bij opslaan van opname"
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Record Meeting</h1>
        <p className="text-muted-foreground">
          Record audio directly from your browser with live transcription
        </p>
      </div>

      {/* Auto-process indicator */}
      {autoProcessEnabled ? (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">
              Auto-verwerking actief
            </Badge>
            <span className="text-sm">
              AI-gestuurde verwerking van je opname wordt automatisch verwerkt
              na opslaan
            </span>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Auto-verwerking uit
            </Badge>
            <span className="text-sm">
              Je kunt verwerking handmatig starten na opslaan in{" "}
              <a
                href="/settings/profile"
                className="font-medium text-primary hover:underline"
              >
                instellingen
              </a>
              .
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderIcon className="w-5 h-5" />
            Select Project
          </CardTitle>
          <CardDescription>
            Choose which project this recording belongs to
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                  {project.description && (
                    <span className="text-muted-foreground text-sm ml-2">
                      - {project.description}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Live Recorder */}
      {selectedProjectId ? (
        <LiveRecorder onRecordingComplete={handleLiveRecordingComplete} />
      ) : (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Selecteer een project om te beginnen met opnemen
          </AlertDescription>
        </Alert>
      )}

      {isUploading && (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Opname wordt opgeslagen en geüpload... Een moment geduld.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

