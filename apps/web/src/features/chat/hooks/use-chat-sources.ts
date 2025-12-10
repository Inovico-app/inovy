import { useMemo, useRef } from "react";
import type { SourceReference } from "../types";

interface UseChatSourcesReturn {
  messageSourcesMap: Record<string, SourceReference[]>;
  sourceRefsMap: React.MutableRefObject<
    Record<string, Record<number, HTMLDivElement | null>>
  >;
  setSourceRef: (
    messageId: string,
    sourceIndex: number,
    element: HTMLDivElement | null
  ) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  metadata?: unknown;
}

export function useChatSources(messages: Message[]): UseChatSourcesReturn {
  const sourceRefsMap = useRef<
    Record<string, Record<number, HTMLDivElement | null>>
  >({});

  // Extract sources from message metadata using useMemo instead of useEffect
  const messageSourcesMap = useMemo(() => {
    const newSourcesMap: Record<string, SourceReference[]> = {};

    messages.forEach((message) => {
      if (message.role === "assistant" && message.metadata) {
        const metadata = message.metadata as { sources?: SourceReference[] };
        if (metadata.sources && Array.isArray(metadata.sources)) {
          newSourcesMap[message.id] = metadata.sources;
        }
      }
    });

    return newSourcesMap;
  }, [messages]);

  const setSourceRef = (
    messageId: string,
    sourceIndex: number,
    element: HTMLDivElement | null
  ) => {
    if (!sourceRefsMap.current[messageId]) {
      sourceRefsMap.current[messageId] = {};
    }
    sourceRefsMap.current[messageId]![sourceIndex] = element;
  };

  return {
    messageSourcesMap,
    sourceRefsMap,
    setSourceRef,
  };
}

