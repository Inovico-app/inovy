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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAutoProcessPreferenceClient } from "@/lib/recording-preferences";
import { put } from "@vercel/blob";
import { uploadRecordingFormAction } from "@/features/recordings/actions/upload-recording";
import { InfoIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LiveRecorder } from "./live-recorder/live-recorder";
import { UploadRecordingForm } from "./upload-recording-form";

interface UploadModeSelectorProps {
  projectId: string;
}

export function UploadModeSelector({ projectId }: UploadModeSelectorProps) {
  const router = useRouter();
  const [_isUploading, setIsUploading] = useState(false);
  const [autoProcessEnabled, setAutoProcessEnabled] = useState(false);

  // Check auto-process preference on mount
  useEffect(() => {
    try {
      const preference = getAutoProcessPreferenceClient();
      setAutoProcessEnabled(preference);
    } catch (error) {
      console.error("Failed to check auto-process preference:", error);
    }
  }, []);

  const handleLiveRecordingComplete = async (
    audioBlob: Blob,
    _transcription: string,
    consentGranted: boolean,
    consentGrantedAt: Date
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

      // Create form data with consent information
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("projectId", projectId);
      formData.append(
        "title",
        `Live opname ${new Date().toLocaleString("nl-NL")}`
      );
      formData.append("description", "Live opgenomen gesprek");
      formData.append("recordingDate", new Date().toISOString());
      formData.append("recordingMode", "live");
      formData.append("consentGiven", consentGranted.toString());
      formData.append("consentGivenAt", consentGrantedAt.toISOString());

      // Use server action which handles FormData properly
      const result = await uploadRecordingFormAction(formData);

      if (result.success && result.recordingId) {
        // Save transcription (already done by live recording)
        toast.success("Opname succesvol opgeslagen!");

        // Refresh the router cache to get updated data
        router.refresh();
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

      <TabsContent value="live" className="space-y-4">
        {/* Auto-process indicator */}
        {autoProcessEnabled ? (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                Auto-verwerking actief
              </Badge>
              <span className="text-sm">
                Je opname wordt automatisch verwerkt na opslaan
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
                Automatische verwerking van je opname is uitgeschakeld. Je kunt
                AI-gestuurde verwerking handmatig starten na opslaan in{" "}
              </span>
              <Link
                href="/settings/profile"
                className="font-medium text-primary hover:underline"
              >
                instellingen
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <LiveRecorder onRecordingComplete={handleLiveRecordingComplete} />
      </TabsContent>
    </Tabs>
  );
}

