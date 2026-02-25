"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { MicrophoneGainControl } from "@/features/recordings/components/live-recorder/microphone-gain-control";
import { useMicrophone } from "@/providers/microphone/MicrophoneProvider";
import { Mic, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MeetingSettingsMenuProps {
  liveTranscriptionEnabled: boolean;
  onTranscriptionToggle: (enabled: boolean) => void;
  autoProcessEnabled: boolean;
  onAutoProcessToggle: () => void;
  isRecording: boolean;
  isSavingPreference: boolean;
}

export function MeetingSettingsMenu({
  liveTranscriptionEnabled,
  onTranscriptionToggle,
  autoProcessEnabled,
  onAutoProcessToggle,
  isRecording,
  isSavingPreference,
}: MeetingSettingsMenuProps) {
  const { gain, setGain } = useMicrophone();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Open meeting settings"
          className="shrink-0"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-sm mb-1">Meeting Settings</h3>
            <p className="text-xs text-muted-foreground">
              Configure recording and processing options
            </p>
          </div>

          <div className="space-y-4">
            {/* Microphone Gain (Input Sensitivity) */}
            <MicrophoneGainControl
              gain={gain}
              onGainChange={setGain}
              disabled={false}
            />

            <div className="border-t pt-4" />

            {/* Real-time Transcription Toggle */}
            <div className="space-y-2">
              <Label
                htmlFor="settings-live-transcription-toggle"
                className="flex flex-col gap-2 rounded-lg border p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      Real-time Transcription
                    </span>
                    <Badge
                      variant={liveTranscriptionEnabled ? "default" : "outline"}
                      className="text-xs shrink-0"
                    >
                      {liveTranscriptionEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <Switch
                    id="settings-live-transcription-toggle"
                    checked={liveTranscriptionEnabled}
                    onCheckedChange={onTranscriptionToggle}
                    disabled={isRecording}
                    aria-label="Toggle real-time transcription"
                    className="shrink-0"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Transcribe speech to text during recording
                </p>
              </Label>
              {isRecording && liveTranscriptionEnabled && (
                <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Cannot be changed while recording
                </p>
              )}
            </div>

            <div className="border-t pt-4" />

            {/* Auto Processing Toggle */}
            <div className="space-y-2">
              <Label
                htmlFor="settings-auto-process-toggle"
                className="flex flex-col gap-2 rounded-lg border p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Auto Processing
                    </span>
                    <Badge
                      variant={autoProcessEnabled ? "default" : "outline"}
                      className="text-xs shrink-0"
                    >
                      {autoProcessEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <Switch
                    id="settings-auto-process-toggle"
                    checked={autoProcessEnabled}
                    onCheckedChange={onAutoProcessToggle}
                    disabled={isSavingPreference}
                    aria-label="Toggle auto processing"
                    className="shrink-0"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {autoProcessEnabled
                    ? "Recordings will be automatically processed with AI"
                    : "You can manually start processing per recording"}
                </p>
              </Label>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
