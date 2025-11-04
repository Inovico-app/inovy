"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Search, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useConversationHistory } from "../hooks/use-conversation-history";
import { useConversationSearch } from "../hooks/use-conversation-search";
import { ConversationListItem } from "./conversation-list-item";
import { cn } from "@/lib/utils";

interface ConversationHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  context: "project" | "organization";
  projectId?: string;
  currentConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
}

export function ConversationHistorySidebar({
  isOpen,
  onClose,
  context,
  projectId,
  currentConversationId,
  onSelectConversation,
}: ConversationHistorySidebarProps) {
  const [filter, setFilter] = useState<
    "all" | "active" | "archived" | "deleted"
  >("active");
  const [page, setPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);

  const { data, isLoading } = useConversationHistory(
    {
      context,
      projectId,
      filter,
      page,
      limit: 20,
    },
    isOpen && !isSearching
  );

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    data: searchResults,
    isLoading: isSearchLoading,
  } = useConversationSearch(context, projectId);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setIsSearching(value.length > 0);
  };

  const displayConversations = isSearching ? searchResults : data?.conversations;
  const totalCount = isSearching ? searchResults?.length : data?.total;

  const renderEmptyState = () => {
    if (isSearching) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            No conversations found matching &quot;{searchQuery}&quot;
          </p>
        </div>
      );
    }

    const emptyMessages = {
      active: "No active conversations yet",
      archived: "No archived conversations",
      deleted: "No deleted conversations",
      all: "No conversations yet",
    };

    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">{emptyMessages[filter]}</p>
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-80 bg-background border-r shadow-lg transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Conversation History</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Filters */}
          {!isSearching && (
            <div className="px-4 pt-4">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="active" className="text-xs">
                    Active
                  </TabsTrigger>
                  <TabsTrigger value="archived" className="text-xs">
                    Archived
                  </TabsTrigger>
                  <TabsTrigger value="deleted" className="text-xs">
                    Deleted
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-xs">
                    All
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading || isSearchLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : displayConversations && displayConversations.length > 0 ? (
              <div className="space-y-2">
                {displayConversations.map((conversation: typeof displayConversations[0]) => (
                  <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={conversation.id === currentConversationId}
                    onClick={() => {
                      onSelectConversation(conversation.id);
                      onClose();
                    }}
                  />
                ))}
              </div>
            ) : (
              renderEmptyState()
            )}
          </div>

          {/* Pagination */}
          {!isSearching && data && data.total > 20 && (
            <div className="p-4 border-t flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(data.total / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(data.total / 20)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

