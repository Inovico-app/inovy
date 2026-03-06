"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import { useAgendaActions } from "../hooks/use-agenda-actions";
import {
  agendaItemStatusColors,
  formatStatusLabel,
} from "../lib/meeting-constants";
import type { MeetingAgendaItem } from "@/server/db/schema/meeting-agenda-items";
import type { MeetingAgendaTemplate } from "@/server/db/schema/meeting-agenda-templates";

interface AgendaBuilderProps {
  meetingId: string;
  items: MeetingAgendaItem[];
  templates: MeetingAgendaTemplate[];
}

export function AgendaBuilder({
  meetingId,
  items,
  templates,
}: AgendaBuilderProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiInput, setShowAiInput] = useState(false);

  const {
    addItem,
    isAddingItem,
    updateItem,
    deleteItem,
    isDeletingItem,
    applyTemplate,
    isApplyingTemplate,
    generateAgenda,
    isGeneratingAgenda,
  } = useAgendaActions();

  const handleAddItem = () => {
    if (!newTitle.trim()) return;
    addItem({
      meetingId,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      sortOrder: items.length,
    });
    setNewTitle("");
    setNewDescription("");
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const currentItem = items[index];
    const targetItem = items[targetIndex];

    updateItem({
      id: currentItem.id,
      meetingId,
      sortOrder: targetItem.sortOrder,
    });
    updateItem({
      id: targetItem.id,
      meetingId,
      sortOrder: currentItem.sortOrder,
    });
  };

  const handleGenerateAgenda = () => {
    if (!aiPrompt.trim() || aiPrompt.trim().length < 10) return;
    generateAgenda({ meetingId, prompt: aiPrompt.trim() });
    setAiPrompt("");
    setShowAiInput(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Agenda</h3>
        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <Select
              onValueChange={(templateId) => {
                applyTemplate({
                  meetingId,
                  templateId,
                  replaceExisting: items.length === 0,
                });
              }}
              disabled={isApplyingTemplate}
            >
              <SelectTrigger className="w-[180px]">
                <LayoutTemplate className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Use template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAiInput(!showAiInput)}
            disabled={isGeneratingAgenda}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isGeneratingAgenda ? "Generating..." : "AI Generate"}
          </Button>
        </div>
      </div>

      {showAiInput && (
        <div className="flex gap-2 rounded-lg border p-3 bg-muted/30">
          <Input
            placeholder="Describe your meeting (e.g., 'Weekly sprint review for engineering team')"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGenerateAgenda();
            }}
            disabled={isGeneratingAgenda}
          />
          <Button
            size="sm"
            onClick={handleGenerateAgenda}
            disabled={isGeneratingAgenda || aiPrompt.trim().length < 10}
          >
            Generate
          </Button>
        </div>
      )}

      {/* Agenda items list */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-start gap-2 rounded-lg border p-3 bg-card"
          >
            <div className="flex flex-col gap-1 pt-1">
              <button
                type="button"
                onClick={() => handleMoveItem(index, "up")}
                disabled={index === 0}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveItem(index, "down")}
                disabled={index === items.length - 1}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{item.title}</span>
                <Badge
                  variant="secondary"
                  className={agendaItemStatusColors[item.status]}
                >
                  {formatStatusLabel(item.status)}
                </Badge>
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              )}
              {item.aiSummary && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1 italic">
                  {item.aiSummary}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteItem({ id: item.id, meetingId })}
              disabled={isDeletingItem}
              aria-label="Remove agenda item"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add new item form */}
      <div className="rounded-lg border border-dashed p-3 space-y-2">
        <Input
          placeholder="Add agenda item..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTitle.trim()) handleAddItem();
          }}
          disabled={isAddingItem}
        />
        {newTitle.trim() && (
          <Textarea
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            disabled={isAddingItem}
          />
        )}
        <Button
          size="sm"
          onClick={handleAddItem}
          disabled={!newTitle.trim() || isAddingItem}
        >
          <Plus className="mr-2 h-4 w-4" />
          {isAddingItem ? "Adding..." : "Add Item"}
        </Button>
      </div>
    </div>
  );
}
