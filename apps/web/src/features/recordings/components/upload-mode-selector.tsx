"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadRecordingForm } from "./upload-recording-form";
import { LiveRecorder } from "./live-recorder";
import { useRouter } from "next/navigation";
import { uploadRecordingFormAction } from "../actions/upload-recording";
import { put } from "@vercel/blob";
import { toast } from "sonner";

interface UploadModeSelectorProps {
  projectId: string;
}

export function UploadModeSelector({ projectId }: UploadModeSelectorProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const handleLiveRecordingComplete = async (
    audioBlob: Blob,
    transcription: string
  ) => {
    try {
      setIsUploading(true);

      // Convert blob to file
      const audioFile = new File(
        [audioBlob],
        `live-recording-${Date.now()}.webm`,
        { type: "audio/webm" }
      );

      // Upload to Vercel Blob
      const blob = await put(`recordings/${audioFile.name}`, audioFile, {
        access: "public",
      });

      // Create form data
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("projectId", projectId);
      formData.append("title", `Live opname ${new Date().toLocaleString("nl-NL")}`);
      formData.append("description", "Live opgenomen gesprek");
      formData.append("recordingDate", new Date().toISOString());

      // Save recording with transcription
      const result = await uploadRecordingFormAction(formData);

      if (result.success && result.recordingId) {
        // Save transcription (already done by live recording)
        toast.success("Opname succesvol opgeslagen!");
        router.push(`/projects/${projectId}/recordings/${result.recordingId}`);
      } else {
        toast.error(result.error || "Fout bij opslaan van opname");
      }
    } catch (error) {
      console.error("Error saving live recording:", error);
      toast.error("Fout bij opslaan van opname");
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
              Upload een audio of video bestand en voeg details toe over de vergadering
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

