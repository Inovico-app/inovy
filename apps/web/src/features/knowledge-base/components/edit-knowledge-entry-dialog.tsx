"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { updateKnowledgeEntryAction } from "../actions/update-entry";
import type { KnowledgeEntryDto } from "@/server/dto/knowledge-base.dto";

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
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    term: entry.term,
    definition: entry.definition,
    context: entry.context || "",
    examples: entry.examples?.join("\n") || "",
    isActive: entry.isActive,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        term: entry.term,
        definition: entry.definition,
        context: entry.context || "",
        examples: entry.examples?.join("\n") || "",
        isActive: entry.isActive,
      });
    }
  }, [entry, open]);

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

      const result = await updateKnowledgeEntryAction({
        id: entry.id,
        term: formData.term,
        definition: formData.definition,
        context: formData.context || null,
        examples: examplesArray,
        isActive: formData.isActive,
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

      if (result?.data) {
        toast.success("Knowledge entry updated successfully");
        onSuccess?.(result.data);
        onOpenChange(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Error updating knowledge entry:", error);
      toast.error("Failed to update knowledge entry");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Knowledge Entry</DialogTitle>
          <DialogDescription>
            Update the term and definition
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
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
            <Label htmlFor="isActive">Active</Label>
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
              {isLoading ? "Updating..." : "Update Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

