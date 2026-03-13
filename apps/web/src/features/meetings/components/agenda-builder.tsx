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
  X,
  Sparkles,
  LayoutTemplate,
  GripVertical,
  Loader2,
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
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {templates.length > 0 && (
          <Select
            onValueChange={(templateId) => {
              if (!templateId) return;
              applyTemplate({
                meetingId,
                templateId: templateId as string,
                replaceExisting: items.length === 0,
              });
            }}
            disabled={isApplyingTemplate}
          >
            <SelectTrigger className="w-[170px] h-8 text-xs">
              <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />
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
          variant={showAiInput ? "secondary" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setShowAiInput(!showAiInput)}
          disabled={isGeneratingAgenda}
        >
          {isGeneratingAgenda ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isGeneratingAgenda ? "Generating..." : "AI Generate"}
        </Button>
      </div>

      {/* AI Generation Input */}
      {showAiInput && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            Describe the meeting and we&apos;ll generate an agenda for you.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., 'Weekly sprint review for engineering team'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGenerateAgenda();
              }}
              disabled={isGeneratingAgenda}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={handleGenerateAgenda}
              disabled={isGeneratingAgenda || aiPrompt.trim().length < 10}
            >
              Generate
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && !showAiInput && (
        <div className="rounded-lg border border-dashed border-border/80 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No agenda items yet. Add one below or use AI to generate.
          </p>
        </div>
      )}

      {/* Agenda Items */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="group flex items-start gap-1.5 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:border-border"
            >
              {/* Reorder controls */}
              <div className="flex flex-col items-center gap-0.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleMoveItem(index, "up")}
                  disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                  aria-label="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <GripVertical className="h-3 w-3 text-muted-foreground/40" />
                <button
                  type="button"
                  onClick={() => handleMoveItem(index, "down")}
                  disabled={index === items.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                  aria-label="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Item number */}
              <span className="text-xs font-mono text-muted-foreground/50 pt-1 w-5 text-right shrink-0">
                {index + 1}.
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm leading-snug">
                    {item.title}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${agendaItemStatusColors[item.status]}`}
                  >
                    {formatStatusLabel(item.status)}
                  </Badge>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                )}
                {item.aiSummary && (
                  <p className="text-xs text-accent mt-1 italic leading-relaxed">
                    {item.aiSummary}
                  </p>
                )}
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => deleteItem({ id: item.id, meetingId })}
                disabled={isDeletingItem}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 shrink-0"
                aria-label="Remove agenda item"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Item */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Add agenda item..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim()) handleAddItem();
            }}
            disabled={isAddingItem}
            className="text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddItem}
            disabled={!newTitle.trim() || isAddingItem}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {isAddingItem ? "Adding..." : "Add"}
          </Button>
        </div>
        {newTitle.trim() && (
          <Textarea
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            disabled={isAddingItem}
            className="text-sm resize-none"
          />
        )}
      </div>
    </div>
  );
}
