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
import { FieldGroup } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import {
  FieldInput,
  FieldSelect,
  FieldTextarea,
} from "@/components/ui/form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_CONFIG,
  VOCABULARY_CATEGORIES,
  parseBoostValue,
} from "../lib/vocabulary-category";
import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
import type { KnowledgeEntryDto } from "@/server/dto/knowledge-base.dto";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createKnowledgeEntryAction } from "../actions/create-entry";
import {
  createKnowledgeEntryFormSchema,
  type CreateKnowledgeEntryFormValues,
} from "../validation/knowledge-entry-form.schema";

interface CreateKnowledgeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: KnowledgeBaseScope;
  scopeId: string | null;
  onSuccess?: (entry: KnowledgeEntryDto) => void;
}

export function CreateKnowledgeEntryDialog({
  open,
  onOpenChange,
  scope,
  scopeId,
  onSuccess,
}: CreateKnowledgeEntryDialogProps) {
  const router = useRouter();

  const form = useForm<CreateKnowledgeEntryFormValues>({
    resolver: standardSchemaResolver(createKnowledgeEntryFormSchema),
    defaultValues: {
      term: "",
      definition: "",
      context: "",
      examples: "",
      boost: "",
      category: "custom",
    },
    mode: "onChange",
  });

  const { execute, isExecuting } = useAction(createKnowledgeEntryAction, {
    onSuccess: ({ data }) => {
      if (data) {
        toast.success("Knowledge entry created successfully");
        onSuccess?.(data);
        onOpenChange(false);
        form.reset();
        router.refresh();
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to create knowledge entry");
    },
  });

  const handleSubmit = (data: CreateKnowledgeEntryFormValues) => {
    const examplesArray = data.examples
      ? data.examples
          .split("\n")
          .map((ex) => ex.trim())
          .filter((ex) => ex.length > 0)
      : null;

    const boostValue = parseBoostValue(data.boost);

    execute({
      scope,
      scopeId,
      term: data.term,
      definition: data.definition,
      context: data.context || null,
      examples: examplesArray,
      boost: boostValue,
      category: data.category,
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Knowledge Entry</DialogTitle>
          <DialogDescription>
            Add a new term and definition to the knowledge base
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FieldGroup>
              <Controller
                control={form.control}
                name="term"
                render={({ field, fieldState }) => (
                  <FieldInput
                    label="Term *"
                    field={field}
                    fieldState={fieldState}
                    placeholder="e.g., MVP"
                    maxLength={100}
                    disabled={isExecuting}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="definition"
                render={({ field, fieldState }) => (
                  <FieldTextarea
                    label="Definition *"
                    field={field}
                    fieldState={fieldState}
                    placeholder="e.g., Minimum Viable Product - the simplest version of a product that can be released"
                    rows={4}
                    maxLength={5000}
                    disabled={isExecuting}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="context"
                render={({ field, fieldState }) => (
                  <FieldTextarea
                    label="Context (optional)"
                    field={field}
                    fieldState={fieldState}
                    placeholder="Additional context about when/how this term is used"
                    rows={2}
                    maxLength={1000}
                    disabled={isExecuting}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="examples"
                render={({ field, fieldState }) => (
                  <FieldTextarea
                    label="Examples (optional, one per line)"
                    field={field}
                    fieldState={fieldState}
                    placeholder="Example 1&#10;Example 2"
                    rows={3}
                    disabled={isExecuting}
                  />
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="boost"
                  render={({ field, fieldState }) => (
                    <FieldInput
                      label="Transcription Boost (optional)"
                      field={field}
                      fieldState={fieldState}
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      placeholder="Default (no boost)"
                      disabled={isExecuting}
                    />
                  )}
                />

                <Controller
                  control={form.control}
                  name="category"
                  render={({ field, fieldState }) => (
                    <FieldSelect
                      label="Category"
                      field={field}
                      fieldState={fieldState}
                    >
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isExecuting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {VOCABULARY_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {CATEGORY_CONFIG[cat].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldSelect>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isExecuting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isExecuting}>
                  {isExecuting ? "Creating..." : "Create Entry"}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
