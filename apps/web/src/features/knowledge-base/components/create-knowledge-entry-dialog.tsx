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
import { Textarea } from "@/components/ui/textarea";
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

    execute({
      scope,
      scopeId,
      term: data.term,
      definition: data.definition,
      context: data.context || null,
      examples: examplesArray,
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
