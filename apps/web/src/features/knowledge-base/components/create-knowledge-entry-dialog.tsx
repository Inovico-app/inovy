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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORY_CONFIG,
  VOCABULARY_CATEGORIES,
} from "../lib/vocabulary-category";
import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
import type { KnowledgeEntryDto } from "@/server/dto/knowledge-base.dto";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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

    const boostValue =
      typeof data.boost === "string"
        ? data.boost === ""
          ? null
          : parseFloat(data.boost)
        : data.boost;

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
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="term"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Term *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., MVP"
                      maxLength={100}
                      disabled={isExecuting}
                      {...field}
                    />
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
                    <Textarea
                      placeholder="e.g., Minimum Viable Product - the simplest version of a product that can be released"
                      rows={4}
                      maxLength={5000}
                      disabled={isExecuting}
                      {...field}
                    />
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
                    <Textarea
                      placeholder="Additional context about when/how this term is used"
                      rows={2}
                      maxLength={1000}
                      disabled={isExecuting}
                      {...field}
                    />
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
                    <Textarea
                      placeholder="Example 1&#10;Example 2"
                      rows={3}
                      disabled={isExecuting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="boost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transcription Boost (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={2}
                        step={0.1}
                        placeholder="Default (no boost)"
                        disabled={isExecuting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isExecuting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VOCABULARY_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {CATEGORY_CONFIG[cat].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
