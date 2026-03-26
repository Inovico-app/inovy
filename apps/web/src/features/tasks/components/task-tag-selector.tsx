"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Tags, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOrganizationTags } from "../hooks/use-organization-tags";
import { useCreateTagMutation } from "../hooks/use-create-tag-mutation";

interface TaskTagSelectorProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

const predefinedColors = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export function TaskTagSelector({
  selectedTagIds,
  onTagsChange,
}: TaskTagSelectorProps) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(predefinedColors[0]);

  const { data: tags, isLoading } = useOrganizationTags();
  const createTagMutation = useCreateTagMutation();

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    await createTagMutation.mutateAsync({
      name: newTagName.trim(),
      color: newTagColor,
    });

    setNewTagName("");
    setNewTagColor(predefinedColors[0]);
    setIsCreating(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t("tags")}</Label>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger
            render={<Button variant="outline" size="sm" type="button" />}
          >
            <Plus className="h-3 w-3 mr-1" />
            {t("newTag")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create {t("newTag")}</DialogTitle>
              <DialogDescription>
                {t("createNewTagDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tag-name">{t("tagNameLabel")}</Label>
                <Input
                  id="tag-name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder={t("tagNamePlaceholder")}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("colorLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagColor(color)}
                      className={`h-8 w-8 rounded-full border-2 ${
                        newTagColor === color
                          ? "border-foreground"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={t("selectColor", { color })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewTagName("");
                  setNewTagColor(predefinedColors[0]);
                }}
                type="button"
              >
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || createTagMutation.isPending}
                type="button"
              >
                {createTagMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("createTag")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">{t("loadingTags")}</div>
      )}

      {!isLoading && tags && tags.length === 0 && (
        <div className="text-sm text-muted-foreground py-2">
          <Tags className="h-4 w-4 inline mr-1" />
          {t("noTagsAvailable")}
        </div>
      )}

      {!isLoading && tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
          {tags.map((tag) => (
            <label
              key={tag.id}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <Checkbox
                checked={selectedTagIds.includes(tag.id)}
                onCheckedChange={() => handleToggleTag(tag.id)}
              />
              <Badge
                variant="outline"
                className="cursor-pointer group-hover:scale-105 transition-transform"
                style={{
                  backgroundColor: selectedTagIds.includes(tag.id)
                    ? tag.color
                    : "transparent",
                  color: selectedTagIds.includes(tag.id) ? "white" : tag.color,
                  borderColor: tag.color,
                }}
              >
                {tag.name}
              </Badge>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
