"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { KnowledgeEntryDto } from "@/server/dto/knowledge-base.dto";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateKnowledgeEntryAction } from "../actions/update-entry";
import {
  editKnowledgeEntryFormSchema,
  type EditKnowledgeEntryFormValues,
} from "../validation/knowledge-entry-form.schema";

interface EditKnowledgeEntryDialogProps {
  entry: KnowledgeEntryDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (entry: KnowledgeEntryDto) => void;
}

export function EditKnowledgeEntryDialog({
  entry,
  open,
  onOpenChange,
  onSuccess,
}: EditKnowledgeEntryDialogProps) {
  const router = useRouter();

  const form = useForm<EditKnowledgeEntryFormValues>({
    resolver: standardSchemaResolver(editKnowledgeEntryFormSchema),
    defaultValues: {
      term: entry.term,
      definition: entry.definition,
      context: entry.context || "",
      examples: entry.examples?.join("\n") || "",
      isActive: entry.isActive,
    },
  });

  const { execute: updateEntry, isExecuting: isUpdating } = useAction(
    updateKnowledgeEntryAction,
    {
      onSuccess: ({ data }) => {
        if (data) {
          toast.success("Knowledge entry updated successfully");
          onSuccess?.(data);
          onOpenChange(false);
          router.refresh();
        }
      },
      onError: ({ error }) => {
        if (error.validationErrors) {
          const firstFieldErrors = Object.values(error.validationErrors)[0];
          const firstError = Array.isArray(firstFieldErrors)
            ? firstFieldErrors[0]
            : typeof firstFieldErrors === "object" &&
                firstFieldErrors !== null &&
                "_errors" in firstFieldErrors &&
                Array.isArray(firstFieldErrors._errors)
              ? firstFieldErrors._errors[0]
              : undefined;
          toast.error(
            typeof firstError === "string" ? firstError : "Validation failed"
          );
          return;
        }
        toast.error(error.serverError || "Failed to update knowledge entry");
      },
    }
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      form.reset({
        term: entry.term,
        definition: entry.definition,
        context: entry.context || "",
        examples: entry.examples?.join("\n") || "",
        isActive: entry.isActive,
      });
    }
    onOpenChange(newOpen);
  };

  const onSubmit = (values: EditKnowledgeEntryFormValues) => {
    const examplesArray = values.examples
      ? values.examples
          .split("\n")
          .map((ex) => ex.trim())
          .filter((ex) => ex.length > 0)
      : null;

    updateEntry({
      id: entry.id,
      term: values.term,
      definition: values.definition,
      context: values.context || null,
      examples: examplesArray,
      isActive: values.isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Knowledge Entry</DialogTitle>
          <DialogDescription>
            Update the term and definition
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="term"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Term *</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={100} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="definition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Definition *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} maxLength={5000} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} maxLength={1000} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="examples"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Examples (optional, one per line)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Active</FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Update Entry"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
