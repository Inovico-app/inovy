"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AudioSourceSelector } from "@/features/recordings/components/live-recorder/audio-source-selector";
import { MicrophoneDeviceSelector } from "@/features/recordings/components/live-recorder/microphone-device-selector";
import { MicrophoneGainControl } from "@/features/recordings/components/live-recorder/microphone-gain-control";
import type { AudioSourceType } from "@/features/recordings/lib/audio-source-preferences";
import { useMicrophone } from "@/providers/microphone/MicrophoneProvider";
import { Mic, Settings2, Sparkles } from "lucide-react";

interface MeetingSettingsMenuProps {
  audioSource: AudioSourceType;
  onAudioSourceChange: (source: AudioSourceType) => void;
  isSystemAudioSupported: boolean;
  liveTranscriptionEnabled: boolean;
  onTranscriptionToggle: (enabled: boolean) => void;
  autoProcessEnabled: boolean;
  onAutoProcessToggle: () => void;
  isRecording: boolean;
  isSavingPreference: boolean;
}

export function MeetingSettingsMenu({
  audioSource,
  onAudioSourceChange,
  isSystemAudioSupported,
  liveTranscriptionEnabled,
  onTranscriptionToggle,
  autoProcessEnabled,
  onAutoProcessToggle,
  isRecording,
  isSavingPreference,
}: MeetingSettingsMenuProps) {
  const { gain, setGain, deviceId, setDeviceId } = useMicrophone();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Open meeting settings"
          className="shrink-0 gap-2"
        >
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96"
        align="end"
        role="dialog"
        aria-label="Meeting settings"
      >
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm" id="meeting-settings-title">
              Meeting Settings
            </h3>
            <p
              className="text-xs text-muted-foreground mt-0.5"
              id="meeting-settings-desc"
            >
              Configure audio, transcription, and processing options
            </p>
          </div>

          {/* Audio section */}
          <fieldset
            className="space-y-4"
            aria-labelledby="audio-settings-heading"
          >
            <legend
              id="audio-settings-heading"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Audio
            </legend>

            <AudioSourceSelector
              audioSource={audioSource}
              onAudioSourceChange={onAudioSourceChange}
              isSystemAudioSupported={isSystemAudioSupported}
              disabled={isRecording}
            />

            {(audioSource === "microphone" || audioSource === "both") && (
              <>
                <MicrophoneDeviceSelector
                  deviceId={deviceId}
                  onDeviceChange={setDeviceId}
                  disabled={isRecording}
                />
                <MicrophoneGainControl
                  gain={gain}
                  onGainChange={setGain}
                  disabled={false}
                />
              </>
            )}
          </fieldset>

          <Separator />

          {/* Recording section */}
          <fieldset
            className="space-y-4"
            aria-labelledby="recording-settings-heading"
          >
            <legend
              id="recording-settings-heading"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Recording
            </legend>

            {/* Real-time Transcription Toggle */}
            <div className="space-y-2">
              <Label
                htmlFor="settings-live-transcription-toggle"
                className="flex flex-col gap-2 rounded-lg border p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors focus-within:ring-2 focus-within:ring-ring"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Mic className="w-4 h-4" aria-hidden="true" />
                      Real-time Transcription
                    </span>
                    <Badge
                      variant={liveTranscriptionEnabled ? "default" : "outline"}
                      className="text-xs shrink-0"
                      aria-hidden="true"
                    >
                      {liveTranscriptionEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <Switch
                    id="settings-live-transcription-toggle"
                    checked={liveTranscriptionEnabled}
                    onCheckedChange={onTranscriptionToggle}
                    disabled={isRecording}
                    aria-label={`Real-time transcription is ${liveTranscriptionEnabled ? "enabled" : "disabled"}`}
                    aria-describedby="transcription-desc"
                    className="shrink-0"
                  />
                </div>
                <p
                  id="transcription-desc"
                  className="text-xs text-muted-foreground"
                >
                  Transcribe speech to text during recording
                </p>
              </Label>
              {isRecording && (
                <p
                  className="text-xs text-muted-foreground italic flex items-center gap-1.5"
                  role="status"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-500"
                    aria-hidden="true"
                  />
                  Cannot be changed while recording
                </p>
              )}
            </div>

            {/* Auto Processing Toggle */}
            <div className="space-y-2">
              <Label
                htmlFor="settings-auto-process-toggle"
                className="flex flex-col gap-2 rounded-lg border p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors focus-within:ring-2 focus-within:ring-ring"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                      Auto Processing
                    </span>
                    <Badge
                      variant={autoProcessEnabled ? "default" : "outline"}
                      className="text-xs shrink-0"
                      aria-hidden="true"
                    >
                      {autoProcessEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <Switch
                    id="settings-auto-process-toggle"
                    checked={autoProcessEnabled}
                    onCheckedChange={onAutoProcessToggle}
                    disabled={isSavingPreference}
                    aria-label={`Auto processing is ${autoProcessEnabled ? "enabled" : "disabled"}`}
                    aria-describedby="auto-process-desc"
                    className="shrink-0"
                  />
                </div>
                <p
                  id="auto-process-desc"
                  className="text-xs text-muted-foreground"
                >
                  {autoProcessEnabled
                    ? "Recordings will be automatically processed with AI"
                    : "You can manually start processing per recording"}
                </p>
              </Label>
            </div>
          </fieldset>
        </div>
      </PopoverContent>
    </Popover>
  );
}

