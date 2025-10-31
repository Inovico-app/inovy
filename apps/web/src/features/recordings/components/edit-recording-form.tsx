"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { updateRecordingAction } from "../actions/edit-recording";

const formSchema = z.object({
  title: z
    .string()
    .min(1, "Recording title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  recordingDate: z.string().min(1, "Recording date is required"),
});

type FormData = z.infer<typeof formSchema>;

interface EditRecordingFormProps {
  recordingId: string;
  initialData: {
    title: string;
    description: string | null;
    recordingDate: Date;
  };
  onSuccess?: () => void;
}

export function EditRecordingForm({
  recordingId,
  initialData,
  onSuccess,
}: EditRecordingFormProps) {
  const router = useRouter();

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData.title,
      description: initialData.description ?? "",
      recordingDate: formatDateForInput(initialData.recordingDate),
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const result = await updateRecordingAction({
        recordingId,
        title: data.title,
        description: data.description ?? undefined,
        recordingDate: new Date(data.recordingDate),
      });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      if (result?.validationErrors) {
        const firstFieldErrors = Object.values(result.validationErrors)[0];
        const firstError = Array.isArray(firstFieldErrors)
          ? firstFieldErrors[0]
          : firstFieldErrors?._errors?.[0];
        toast.error(firstError ?? "Validation failed");
        return;
      }

      toast.success("Recording updated successfully");
      router.refresh();
      onSuccess?.();
    } catch (error) {
      console.error("Error updating recording:", error);
      toast.error("Failed to update recording");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">
          Recording Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Enter recording title"
          {...register("title")}
          aria-invalid={errors.title ? "true" : "false"}
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          placeholder="Enter recording description (optional)"
          className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...register("description")}
          aria-invalid={errors.description ? "true" : "false"}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="recordingDate">
          Recording Date <span className="text-red-500">*</span>
        </Label>
        <Input
          id="recordingDate"
          type="date"
          {...register("recordingDate")}
          aria-invalid={errors.recordingDate ? "true" : "false"}
        />
        {errors.recordingDate && (
          <p className="text-sm text-red-500">{errors.recordingDate.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
