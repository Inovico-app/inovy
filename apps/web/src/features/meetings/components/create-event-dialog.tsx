"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
import { useCreateEventForm } from "../hooks/use-create-event-form";
import { TIME_OPTIONS } from "../lib/create-event-schema";
import { AttendeeSelector } from "./attendee-selector";
import { RecurrenceForm } from "./recurrence-form";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
}: CreateEventDialogProps) {
  const {
    form,
    addBot,
    allDay,
    startDate,
    startTime,
    endTime,
    recurrence,
    setRecurrence,
    isCreating,
    onSubmit,
    handleCancel,
  } = useCreateEventForm({ open, onOpenChange });

  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Meeting title"
              aria-invalid={errors.title ? "true" : "false"}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Event description"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register("startDate")}
                  aria-invalid={errors.startDate ? "true" : "false"}
                />
                {errors.startDate && (
                  <p className="text-sm text-destructive">
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">
                  Start Time{" "}
                  {!allDay && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={startTime || ""}
                  onValueChange={(value) => setValue("startTime", value)}
                  disabled={allDay}
                >
                  <SelectTrigger id="startTime" className="w-full">
                    <SelectValue
                      placeholder={allDay ? "All day" : "Select time"}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {TIME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.startTime && (
                  <p className="text-sm text-destructive">
                    {errors.startTime.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endDate">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register("endDate")}
                  min={startDate || undefined}
                  aria-invalid={errors.endDate ? "true" : "false"}
                />
                {errors.endDate && (
                  <p className="text-sm text-destructive">
                    {errors.endDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">
                  End Time{" "}
                  {!allDay && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={endTime || ""}
                  onValueChange={(value) => setValue("endTime", value)}
                  disabled={allDay}
                >
                  <SelectTrigger id="endTime" className="w-full">
                    <SelectValue
                      placeholder={allDay ? "All day" : "Select time"}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {TIME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.endTime && (
                  <p className="text-sm text-destructive">
                    {errors.endTime.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allDay"
                checked={allDay}
                onCheckedChange={(checked) =>
                  setValue("allDay", checked === true)
                }
              />
              <Label
                htmlFor="allDay"
                className="text-sm font-normal cursor-pointer"
              >
                All day
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="Event location"
            />
          </div>

          <RecurrenceForm
            value={recurrence}
            onChange={setRecurrence}
            eventStartDate={startDate}
            disabled={isCreating}
          />

          <AttendeeSelector
            selectedUserIds={watch("attendeeUserIds") || []}
            selectedEmails={watch("attendeeEmails") || []}
            onUserIdsChange={(userIds) => setValue("attendeeUserIds", userIds)}
            onEmailsChange={(emails) => setValue("attendeeEmails", emails)}
            disabled={isCreating}
          />

          <div className="flex items-center space-x-2">
            <Checkbox
              id="addBot"
              checked={addBot}
              onCheckedChange={(checked) =>
                setValue("addBot", checked === true)
              }
            />
            <Label
              htmlFor="addBot"
              className="text-sm font-normal cursor-pointer"
            >
              Add bot to this meeting
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
