"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mic, Sparkles } from "lucide-react";

interface RecordingSettingsSidebarProps {
  liveTranscriptionEnabled: boolean;
  onTranscriptionToggle: (enabled: boolean) => void;
  autoProcessEnabled: boolean;
  onAutoProcessToggle: () => void;
  isRecording: boolean;
  isSavingPreference: boolean;
}

export function RecordingSettingsSidebar({
  liveTranscriptionEnabled,
  onTranscriptionToggle,
  autoProcessEnabled,
  onAutoProcessToggle,
  isRecording,
  isSavingPreference,
}: RecordingSettingsSidebarProps) {
  return (
    <aside className="w-full flex-shrink-0 xl:sticky xl:top-4 h-fit">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Recording Settings
          </CardTitle>
          <CardDescription>
            Configure recording and processing options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Real-time Transcription Toggle */}
          <div className="space-y-3">
            <Label
              htmlFor="live-transcription-toggle"
              className="block space-y-3 rounded-lg border p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Mic className="w-4 h-4" />
                      Real-time Transcription
                    </div>
                    <Badge
                      variant={liveTranscriptionEnabled ? "default" : "outline"}
                      className="text-xs shrink-0"
                    >
                      {liveTranscriptionEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Transcribe speech to text during recording
                  </p>
                </div>
                <Switch
                  id="live-transcription-toggle"
                  checked={liveTranscriptionEnabled}
                  onCheckedChange={onTranscriptionToggle}
                  disabled={isRecording}
                  aria-label="Toggle real-time transcription"
                  className="shrink-0 mt-0.5"
                />
              </div>
            </Label>
            {isRecording && liveTranscriptionEnabled && (
              <p className="text-xs text-muted-foreground italic flex items-center gap-1.5 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Cannot be changed while recording
              </p>
            )}
          </div>

          {/* Auto-process Toggle */}
          <div className="space-y-3">
            <Label
              htmlFor="auto-process-toggle"
              className="block space-y-3 rounded-lg border p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="w-4 h-4" />
                      Auto Processing
                    </div>
                    <Badge
                      variant={autoProcessEnabled ? "default" : "outline"}
                      className="text-xs shrink-0"
                    >
                      {autoProcessEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Automatically process recordings after saving
                  </p>
                </div>
                <Switch
                  id="auto-process-toggle"
                  checked={autoProcessEnabled}
                  onCheckedChange={onAutoProcessToggle}
                  disabled={isSavingPreference}
                  aria-label="Toggle auto processing"
                  className="shrink-0 mt-0.5"
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {autoProcessEnabled
                  ? "Recordings will be automatically processed with AI"
                  : "You can manually start processing per recording"}
              </p>
            </Label>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

