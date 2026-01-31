"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatConversation } from "@/server/db/schema/chat-conversations";
import { Building2, FolderOpen, MoreVertical } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { ConversationActionsMenu } from "./conversation-actions-menu";

interface ConversationListItemProps {
  conversation: ChatConversation & { lastMessage?: string | null };
  isActive?: boolean;
  onClick?: () => void;
}

export function ConversationListItem({
  conversation,
  isActive = false,
  onClick,
}: ConversationListItemProps) {
  const isDeleted = conversation.deletedAt !== null;
  const isArchived = conversation.archivedAt !== null && !isDeleted;

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    // For recent times (< 24 hours), use time-based display
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    }

    // For older dates, use calendar days
    const diffInDays = differenceInCalendarDays(now, date);

    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent cursor-pointer",
        isActive && "bg-accent border-primary",
        isDeleted && "opacity-60",
        isArchived && "opacity-75"
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium truncate">
            {conversation.title || "Untitled Conversation"}
          </h4>
          {conversation.context === "organization" ? (
            <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <FolderOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        {conversation.lastMessage && (
          <p className="text-xs text-muted-foreground truncate mb-1">
            {conversation.lastMessage.length > 100
              ? `${conversation.lastMessage.substring(0, 100)}...`
              : conversation.lastMessage}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {formatDate(conversation.updatedAt)}
          </span>
          {isDeleted && (
            <Badge variant="destructive" className="text-xs">
              Deleted
            </Badge>
          )}
          {isArchived && (
            <Badge variant="secondary" className="text-xs">
              Archived
            </Badge>
          )}
        </div>
      </div>
      <ConversationActionsMenu
        conversation={conversation}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        }
      />
    </div>
  );
}

