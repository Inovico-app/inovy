"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { put } from "@vercel/blob";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { LiveRecorder } from "./live-recorder";
import { UploadRecordingForm } from "./upload-recording-form";

interface UploadModeSelectorProps {
  projectId: string;
}

export function UploadModeSelector({ projectId }: UploadModeSelectorProps) {
  const router = useRouter();
  const [_isUploading, setIsUploading] = useState(false);

  const handleLiveRecordingComplete = async (
    audioBlob: Blob,
    _transcription: string
  ) => {
    try {
      setIsUploading(true);

      // Convert blob to file
      const audioFile = new File(
        [audioBlob],
        `live-recording-${Date.now()}.webm`,
        { type: "audio/webm" }
      );

      // Upload to Vercel Blob - blob var used for API call
      await put(`recordings/${audioFile.name}`, audioFile, {
        access: "public",
      });

      // Create form data
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("projectId", projectId);
      formData.append(
        "title",
        `Live opname ${new Date().toLocaleString("nl-NL")}`
      );
      formData.append("description", "Live opgenomen gesprek");
      formData.append("recordingDate", new Date().toISOString());

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
        // Save transcription (already done by live recording)
        toast.success("Opname succesvol opgeslagen!");
        router.push(`/projects/${projectId}/recordings/${result.recordingId}`);
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
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload">Bestand uploaden</TabsTrigger>
        <TabsTrigger value="live">Live opnemen</TabsTrigger>
      </TabsList>

      <TabsContent value="upload">
        <Card>
          <CardHeader>
            <CardTitle>Opname details</CardTitle>
            <CardDescription>
              Upload een audio of video bestand en voeg details toe over de
              vergadering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadRecordingForm projectId={projectId} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="live">
        <LiveRecorder
          projectId={projectId}
          onRecordingComplete={handleLiveRecordingComplete}
        />
      </TabsContent>
    </Tabs>
  );
}

