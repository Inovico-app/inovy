"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HierarchicalKnowledgeEntryDto } from "@/server/dto/knowledge-base.dto";
import {
  KNOWLEDGE_PRIORITY,
  type KnowledgePriority,
} from "../constants/knowledge-priority";
import {
  BookOpenIcon,
  BuildingIcon,
  FolderIcon,
  GlobeIcon,
  LockIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { DeleteKnowledgeEntryDialog } from "./delete-knowledge-entry-dialog";
import { EditKnowledgeEntryDialog } from "./edit-knowledge-entry-dialog";

interface HierarchicalKnowledgeEntryListProps {
  entries: HierarchicalKnowledgeEntryDto[];
  canEdit: boolean;
  onEntryUpdated: (entry: HierarchicalKnowledgeEntryDto) => void;
  onEntryDeleted: (entryId: string) => void;
}

const scopeConfig: Record<
  KnowledgePriority,
  {
    label: string;
    variant: "default" | "secondary" | "outline";
    icon: typeof FolderIcon;
    editable: boolean;
  }
> = {
  [KNOWLEDGE_PRIORITY.project]: {
    label: "Project",
    variant: "default",
    icon: FolderIcon,
    editable: true,
  },
  [KNOWLEDGE_PRIORITY.organization]: {
    label: "Organization",
    variant: "secondary",
    icon: BuildingIcon,
    editable: false,
  },
  [KNOWLEDGE_PRIORITY.global]: {
    label: "Global",
    variant: "outline",
    icon: GlobeIcon,
    editable: false,
  },
};

const SCOPE_GROUPS = [
  {
    priority: KNOWLEDGE_PRIORITY.project,
    title: "Project Entries",
  },
  {
    priority: KNOWLEDGE_PRIORITY.organization,
    title: "Inherited from Organization",
  },
  {
    priority: KNOWLEDGE_PRIORITY.global,
    title: "Inherited from Global",
  },
] as const;

function groupByPriority(entries: HierarchicalKnowledgeEntryDto[]) {
  const grouped: Record<KnowledgePriority, HierarchicalKnowledgeEntryDto[]> = {
    [KNOWLEDGE_PRIORITY.project]: [],
    [KNOWLEDGE_PRIORITY.organization]: [],
    [KNOWLEDGE_PRIORITY.global]: [],
  };
  for (const entry of entries) {
    grouped[entry.priority as KnowledgePriority]?.push(entry);
  }
  return grouped;
}

export function HierarchicalKnowledgeEntryList({
  entries,
  canEdit,
  onEntryUpdated,
  onEntryDeleted,
}: HierarchicalKnowledgeEntryListProps) {
  const [editingEntry, setEditingEntry] =
    useState<HierarchicalKnowledgeEntryDto | null>(null);
  const [deletingEntry, setDeletingEntry] =
    useState<HierarchicalKnowledgeEntryDto | null>(null);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <BookOpenIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          No knowledge entries available
        </p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Project entries override organization entries, which override global
          entries
        </p>
      </div>
    );
  }

  const grouped = groupByPriority(entries);

  return (
    <div className="space-y-6">
      {SCOPE_GROUPS.map(({ priority, title }) => {
        const group = grouped[priority];
        if (group.length === 0) return null;
        return (
          <ScopeGroup
            key={priority}
            title={title}
            priority={priority}
            entries={group}
            canEdit={canEdit}
            onEdit={setEditingEntry}
            onDelete={setDeletingEntry}
          />
        );
      })}

      {editingEntry && (
        <EditKnowledgeEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          onSuccess={(updatedEntry) => {
            onEntryUpdated({
              ...updatedEntry,
              priority: editingEntry.priority,
            });
            setEditingEntry(null);
          }}
        />
      )}

      {deletingEntry && (
        <DeleteKnowledgeEntryDialog
          entry={deletingEntry}
          open={!!deletingEntry}
          onOpenChange={(open) => !open && setDeletingEntry(null)}
          onSuccess={() => {
            onEntryDeleted(deletingEntry.id);
            setDeletingEntry(null);
          }}
        />
      )}
    </div>
  );
}

interface ScopeGroupProps {
  title: string;
  priority: number;
  entries: HierarchicalKnowledgeEntryDto[];
  canEdit: boolean;
  onEdit: (entry: HierarchicalKnowledgeEntryDto) => void;
  onDelete: (entry: HierarchicalKnowledgeEntryDto) => void;
}

function ScopeGroup({
  title,
  priority,
  entries,
  canEdit,
  onEdit,
  onDelete,
}: ScopeGroupProps) {
  const config = scopeConfig[priority as KnowledgePriority];
  const isReadOnly = !config.editable;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {isReadOnly && (
          <Badge variant="outline" className="text-[10px] gap-1 py-0">
            <LockIcon className="h-2.5 w-2.5" />
            Read-only
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            canEdit={canEdit && config.editable}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

interface EntryRowProps {
  entry: HierarchicalKnowledgeEntryDto;
  canEdit: boolean;
  onEdit: (entry: HierarchicalKnowledgeEntryDto) => void;
  onDelete: (entry: HierarchicalKnowledgeEntryDto) => void;
}

function EntryRow({ entry, canEdit, onEdit, onDelete }: EntryRowProps) {
  const config = scopeConfig[entry.priority as KnowledgePriority];
  const ScopeIcon = config.icon;

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3.5 transition-colors hover:border-border">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <ScopeIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {entry.term}
          </span>
          <Badge variant={config.variant} className="text-[10px] py-0">
            {config.label}
          </Badge>
          {!entry.isActive && (
            <Badge variant="secondary" className="text-[10px] py-0">
              Inactive
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {entry.definition}
        </p>
        {entry.context && (
          <p className="mt-1 text-xs text-muted-foreground/80">
            <span className="font-medium">Context:</span> {entry.context}
          </p>
        )}
        {entry.examples && entry.examples.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {entry.examples.map((example, idx) => (
              <span
                key={`example-${idx}-${example.slice(0, 20)}`}
                className="inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {example}
              </span>
            ))}
          </div>
        )}
      </div>
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Actions for ${entry.term}`}
              />
            }
          >
            <MoreVerticalIcon className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(entry)}>
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(entry)}
              className="text-destructive focus:text-destructive"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
