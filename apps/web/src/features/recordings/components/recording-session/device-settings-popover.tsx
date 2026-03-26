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
import { useId, useState } from "react";

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
  const instanceId = useId();
  const [open, setOpen] = useState(false);

  // Don't render if browser doesn't support enumerateDevices
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.enumerateDevices
  ) {
    return null;
  }

  const displayLabel =
    selectedDeviceId && selectedDeviceId !== "default"
      ? (devices.find((d) => d.deviceId === selectedDeviceId)?.label ??
        "Standaard microfoon")
      : "Standaard microfoon";

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
        aria-labelledby={`${instanceId}-popover-heading`}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <h4
              id={`${instanceId}-popover-heading`}
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
                  htmlFor={`${instanceId}-mic-select`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Selecteer microfoon
                </label>
                <Select
                  value={selectedDeviceId ?? "default"}
                  onValueChange={(value) => {
                    if (value != null) onDeviceChange(value);
                  }}
                  disabled={isDisabled}
                >
                  <SelectTrigger
                    id={`${instanceId}-mic-select`}
                    className={`w-full ${isDisabled ? "pointer-events-none" : ""}`}
                    aria-disabled={isDisabled || undefined}
                    aria-describedby={
                      isDisabled ? `${instanceId}-disabled-hint` : undefined
                    }
                  >
                    <SelectValue placeholder={displayLabel}>
                      {displayLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default" label="Standaard microfoon">
                      Standaard microfoon
                    </SelectItem>
                    {devices.map((device) => (
                      <SelectItem
                        key={device.deviceId}
                        value={device.deviceId}
                        label={device.label}
                      >
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isDisabled && (
                <p
                  id={`${instanceId}-disabled-hint`}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>Pauzeer de opname om van microfoon te wisselen</span>
                </p>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
