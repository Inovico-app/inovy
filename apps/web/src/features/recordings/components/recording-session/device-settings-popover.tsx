"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import type { AudioInputDevice } from "@/features/recordings/hooks/use-audio-devices";
import { Lock, Mic, RotateCcw, Settings2 } from "lucide-react";
import { useState } from "react";

interface DeviceSettingsPopoverProps {
  devices: AudioInputDevice[];
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
  isDisabled: boolean;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function DeviceSettingsPopover({
  devices,
  selectedDeviceId,
  onDeviceChange,
  isDisabled,
  isLoading,
  error,
  onRetry,
}: DeviceSettingsPopoverProps) {
  const [open, setOpen] = useState(false);

  // Don't render if browser doesn't support enumerateDevices
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.enumerateDevices
  ) {
    return null;
  }

  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);
  const displayLabel = selectedDevice?.label ?? "Standaard microfoon";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full"
                  aria-label="Microfooninstellingen"
                />
              }
            >
              <Settings2 className="h-4 w-4" />
            </PopoverTrigger>
          }
        />
        <TooltipContent side="top">
          <p>Microfooninstellingen</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-72"
        role="dialog"
        aria-labelledby="device-popover-heading"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <h4
              id="device-popover-heading"
              className="text-sm font-semibold leading-none"
            >
              Microfoon
            </h4>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ) : error ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">
                Geen microfoons gevonden
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                Opnieuw proberen
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="mic-device-select"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Selecteer microfoon
                </label>
                <Select
                  value={selectedDeviceId ?? undefined}
                  onValueChange={(value) => {
                    if (value) onDeviceChange(value);
                  }}
                  disabled={isDisabled}
                >
                  <SelectTrigger
                    id="mic-device-select"
                    className={`w-full ${isDisabled ? "pointer-events-none" : ""}`}
                    aria-disabled={isDisabled || undefined}
                    aria-describedby={
                      isDisabled ? "device-disabled-hint" : undefined
                    }
                  >
                    <SelectValue placeholder="Standaard microfoon">
                      <span className="truncate">{displayLabel}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        <span className="truncate">{device.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isDisabled && (
                <p
                  id="device-disabled-hint"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>Wissel van microfoon door de opname te stoppen</span>
                </p>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
