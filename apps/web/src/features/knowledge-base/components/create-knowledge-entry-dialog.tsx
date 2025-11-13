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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
import type { KnowledgeEntryDto } from "@/server/dto/knowledge-base.dto";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createKnowledgeEntryAction } from "../actions/create-entry";

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
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    term: "",
    definition: "",
    context: "",
    examples: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const examplesArray = formData.examples
        ? formData.examples
            .split("\n")
            .map((ex) => ex.trim())
            .filter((ex) => ex.length > 0)
        : null;

      const result = await createKnowledgeEntryAction({
        scope,
        scopeId,
        term: formData.term,
        definition: formData.definition,
        context: formData.context || null,
        examples: examplesArray,
      });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      if (result?.validationErrors) {
        const firstFieldErrors = Object.values(result.validationErrors)[0];
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

      if (result?.data) {
        toast.success("Knowledge entry created successfully");
        onSuccess?.(result.data);
        onOpenChange(false);
        setFormData({ term: "", definition: "", context: "", examples: "" });
        router.refresh();
      }
    } catch (error) {
      console.error("Error creating knowledge entry:", error);
      toast.error("Failed to create knowledge entry");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Knowledge Entry</DialogTitle>
          <DialogDescription>
            Add a new term and definition to the knowledge base
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="term">Term *</Label>
            <Input
              id="term"
              value={formData.term}
              onChange={(e) =>
                setFormData({ ...formData, term: e.target.value })
              }
              placeholder="e.g., MVP"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="definition">Definition *</Label>
            <Textarea
              id="definition"
              value={formData.definition}
              onChange={(e) =>
                setFormData({ ...formData, definition: e.target.value })
              }
              placeholder="e.g., Minimum Viable Product - the simplest version of a product that can be released"
              required
              rows={4}
              maxLength={5000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context (optional)</Label>
            <Textarea
              id="context"
              value={formData.context}
              onChange={(e) =>
                setFormData({ ...formData, context: e.target.value })
              }
              placeholder="Additional context about when/how this term is used"
              rows={2}
              maxLength={1000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="examples">Examples (optional, one per line)</Label>
            <Textarea
              id="examples"
              value={formData.examples}
              onChange={(e) =>
                setFormData({ ...formData, examples: e.target.value })
              }
              placeholder="Example 1&#10;Example 2"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

