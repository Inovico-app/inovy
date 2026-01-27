"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAudioDevices } from "@/features/recordings/hooks/use-audio-devices";
import { Loader2, Mic } from "lucide-react";
import { useEffect } from "react";

interface MicrophoneDeviceSelectorProps {
  deviceId: string | null;
  onDeviceChange: (deviceId: string | null) => void;
  disabled?: boolean;
}

export function MicrophoneDeviceSelector({
  deviceId,
  onDeviceChange,
  disabled = false,
}: MicrophoneDeviceSelectorProps) {
  const { devices, isLoading, error } = useAudioDevices();

  // Fall back to default device if selected device is no longer available
  useEffect(() => {
    if (
      !isLoading &&
      deviceId !== null &&
      devices.length > 0 &&
      !devices.some((d) => d.deviceId === deviceId)
    ) {
      // Selected device is no longer available, fall back to default
      onDeviceChange(null);
    }
  }, [devices, deviceId, isLoading, onDeviceChange]);

  const handleValueChange = (value: string) => {
    // "__default__" means "default device" (null)
    const newDeviceId = value === "__default__" ? null : value;
    onDeviceChange(newDeviceId);
  };

  // Current value for Select component ("__default__" for null/default)
  // If deviceId is not in available devices, show default
  const selectValue =
    deviceId === null ||
    deviceId === "" ||
    !devices.some((d) => d.deviceId === deviceId)
      ? "__default__"
      : deviceId;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label
          htmlFor="microphone-device-select"
          className="text-sm font-medium flex items-center gap-2"
        >
          <Mic className="w-4 h-4" />
          Audio Input Device
        </Label>
        {isLoading && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
      <Select
        value={selectValue}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger
          id="microphone-device-select"
          className="w-full"
          aria-label="Select audio input device"
          aria-describedby={
            error
              ? "microphone-device-error"
              : disabled
                ? "microphone-device-disabled"
                : undefined
          }
        >
          <SelectValue placeholder="Select device...">
            {selectValue === "__default__" ? (
              <span className="text-muted-foreground">Default Device</span>
            ) : (
              devices.find((d) => d.deviceId === selectValue)?.label ??
                "Unknown Device"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Default Device Option */}
          <SelectItem value="__default__" key="default">
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium">Default Device</span>
              <span className="text-xs text-muted-foreground">
                Use system default microphone
              </span>
            </div>
          </SelectItem>

          {/* Available Devices */}
          {devices.length === 0 && !isLoading && !error && (
            <SelectItem value="__no_devices__" disabled>
              <span className="text-muted-foreground">
                No devices available
              </span>
            </SelectItem>
          )}

          {devices.map((device) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-medium leading-tight">
                  {device.label}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Error Message */}
      {error && (
        <p
          id="microphone-device-error"
          className="text-xs text-destructive flex items-center gap-1.5"
          role="alert"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
          Failed to load audio devices. Please refresh the page.
        </p>
      )}

      {/* Disabled Message */}
      {disabled && !isLoading && (
        <p
          id="microphone-device-disabled"
          className="text-xs text-muted-foreground italic flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Cannot be changed while recording
        </p>
      )}

      {/* Help Text */}
      {!error && !disabled && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="text-muted-foreground/60">
            Choose which microphone to use
          </span>
        </div>
      )}
    </div>
  );
}

