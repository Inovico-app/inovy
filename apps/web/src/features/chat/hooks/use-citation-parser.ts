import type { SourceReference } from "../types";

interface CitationPart {
  type: "text" | "citation";
  content?: string;
  citationNumber?: number;
  citationIndex?: number;
  messageId?: string;
}

interface UseCitationParserReturn {
  parseCitations: (
    text: string,
    messageId: string
  ) => CitationPart[];
  scrollToSource: (
    messageId: string,
    sourceIndex: number,
    sourceRefsMap: React.MutableRefObject<
      Record<string, Record<number, HTMLDivElement | null>>
    >
  ) => void;
}

export function useCitationParser(): UseCitationParserReturn {
  const parseCitations = (
    text: string,
    messageId: string
  ): CitationPart[] => {
    const citationRegex = /\[(\d+)\]/g;
    const parts: CitationPart[] = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.substring(lastIndex, match.index),
        });
      }

      // Add citation marker
      const citationNumber = parseInt(match[1] || "0", 10);
      parts.push({
        type: "citation",
        citationNumber,
        citationIndex: citationNumber - 1,
        messageId,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex),
      });
    }

    return parts;
  };

  const scrollToSource = (
    messageId: string,
    sourceIndex: number,
    sourceRefsMap: React.MutableRefObject<
      Record<string, Record<number, HTMLDivElement | null>>
    >
  ) => {
    const sourceRef = sourceRefsMap.current[messageId]?.[sourceIndex];
    if (sourceRef) {
      sourceRef.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      // Briefly highlight the source
      sourceRef.classList.add("ring-2", "ring-primary");
      setTimeout(() => {
        sourceRef.classList.remove("ring-2", "ring-primary");
      }, 2000);
    }
  };

  return {
    parseCitations,
    scrollToSource,
  };
}
