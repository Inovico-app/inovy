"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AudioSourceType } from "@/features/recordings/lib/audio-source-preferences";
import { Mic, Speaker, Mic2 } from "lucide-react";

interface AudioSourceSelectorProps {
  audioSource: AudioSourceType;
  onAudioSourceChange: (source: AudioSourceType) => void;
  isSystemAudioSupported: boolean;
  disabled?: boolean;
}

export function AudioSourceSelector({
  audioSource,
  onAudioSourceChange,
  isSystemAudioSupported,
  disabled = false,
}: AudioSourceSelectorProps) {
  const handleValueChange = (value: string) => {
    if (value === "microphone" || value === "system" || value === "both") {
      onAudioSourceChange(value as AudioSourceType);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label
          htmlFor="audio-source-select"
          className="text-sm font-medium flex items-center gap-2"
        >
          <Mic2 className="w-4 h-4" />
          Audio Source
        </Label>
      </div>
      <Select
        value={audioSource}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id="audio-source-select"
          className="w-full"
          aria-label="Select audio source"
        >
          <SelectValue>
            {audioSource === "microphone" && (
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                <span>Microphone Only</span>
              </div>
            )}
            {audioSource === "system" && (
              <div className="flex items-center gap-2">
                <Speaker className="w-4 h-4" />
                <span>System Audio Only</span>
              </div>
            )}
            {audioSource === "both" && (
              <div className="flex items-center gap-2">
                <Mic2 className="w-4 h-4" />
                <span>Microphone + System Audio</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="microphone">
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                <span className="font-medium">Microphone Only</span>
              </div>
              <span className="text-xs text-muted-foreground ml-6">
                Record from your microphone
              </span>
            </div>
          </SelectItem>

          <SelectItem
            value="system"
            disabled={!isSystemAudioSupported}
            className={!isSystemAudioSupported ? "opacity-50" : ""}
          >
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-2">
                <Speaker className="w-4 h-4" />
                <span className="font-medium">System Audio Only</span>
              </div>
              <span className="text-xs text-muted-foreground ml-6">
                Record device sounds (meeting participants)
              </span>
            </div>
          </SelectItem>

          <SelectItem
            value="both"
            disabled={!isSystemAudioSupported}
            className={!isSystemAudioSupported ? "opacity-50" : ""}
          >
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-2">
                <Mic2 className="w-4 h-4" />
                <span className="font-medium">Microphone + System Audio</span>
              </div>
              <span className="text-xs text-muted-foreground ml-6">
                Record both microphone and device sounds
              </span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {disabled && (
        <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Cannot be changed while recording
        </p>
      )}
    </div>
  );
}
