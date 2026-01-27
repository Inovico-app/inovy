"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { setMicrophoneGainPreferenceClient } from "@/features/recordings/lib/microphone-gain-preferences";
import { Volume2 } from "lucide-react";
import { useCallback } from "react";

interface MicrophoneGainControlProps {
  gain: number;
  onGainChange: (gain: number) => void;
  disabled?: boolean;
}

export function MicrophoneGainControl({
  gain,
  onGainChange,
  disabled = false,
}: MicrophoneGainControlProps) {
  // Convert gain (0.0-3.0) to slider value (0-300)
  const sliderValue = Math.round(gain * 100);

  // Convert slider value (0-300) to gain (0.0-3.0)
  const handleSliderChange = useCallback(
    (values: number[]) => {
      const newGain = values[0] / 100;
      onGainChange(newGain);
      // Persist to localStorage
      setMicrophoneGainPreferenceClient(newGain);
    },
    [onGainChange]
  );

  // Format gain as percentage for display
  const gainPercentage = Math.round(gain * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label
          htmlFor="microphone-gain-slider"
          className="text-sm font-medium flex items-center gap-2"
        >
          <Volume2 className="w-4 h-4" />
          Microphone Gain
        </Label>
        <span className="text-sm text-muted-foreground tabular-nums">
          {gainPercentage}%
        </span>
      </div>
      <Slider
        id="microphone-gain-slider"
        min={0}
        max={300}
        step={1}
        value={[sliderValue]}
        onValueChange={handleSliderChange}
        disabled={disabled}
        className="w-full"
        aria-label="Microphone input gain"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span className="text-muted-foreground/60">
          Adjust microphone input sensitivity
        </span>
        <span>300%</span>
      </div>
    </div>
  );
}

