import { useQuery } from "@tanstack/react-query";
import { searchConversationsAction } from "../actions/conversation-history";
import { useState, useCallback, useEffect, useRef } from "react";

export function useConversationSearch(
  context?: "project" | "organization",
  projectId?: string
) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounce search query
  const debouncedSetQuery = useCallback((value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    debouncedSetQuery(value);
  };

  const searchQuery = useQuery({
    queryKey: ["conversation-search", debouncedQuery, context, projectId],
    queryFn: async () => {
      if (!debouncedQuery.trim()) {
        return [];
      }
      const result = await searchConversationsAction({
        query: debouncedQuery,
        context,
        projectId,
      });
      return result?.data ?? [];
    },
    enabled: debouncedQuery.length > 0,
  });

  return {
    query,
    setQuery: handleQueryChange,
    ...searchQuery,
  };
}

