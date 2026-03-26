"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface TranscriptionSearchProps {
  onSearchChange: (query: string, currentMatch: number) => void;
  totalMatches: number;
  currentMatchIndex: number;
}

export function TranscriptionSearch({
  onSearchChange,
  totalMatches,
  currentMatchIndex,
}: TranscriptionSearchProps) {
  const t = useTranslations("recordings");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearchChange(debouncedSearchQuery.trim(), 0);
  };

  const handleNextMatch = () => {
    if (totalMatches > 0) {
      const nextIndex = (currentMatchIndex + 1) % totalMatches;
      onSearchChange(searchQuery, nextIndex);
    }
  };

  const handlePrevMatch = () => {
    if (totalMatches > 0) {
      const prevIndex =
        currentMatchIndex === 0 ? totalMatches - 1 : currentMatchIndex - 1;
      onSearchChange(searchQuery, prevIndex);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setIsOpen(false);
    onSearchChange("", 0);
  };

  useEffect(() => {
    if (debouncedSearchQuery.trim() || debouncedSearchQuery === "") {
      onSearchChange(debouncedSearchQuery.trim(), 0);
    }
  }, [debouncedSearchQuery, onSearchChange]);

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="mb-4"
      >
        {t("transcription.searchInTranscription")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-4 p-2 border rounded-lg bg-muted/50">
      <Input
        type="text"
        placeholder={t("transcription.searchTranscriptionPlaceholder")}
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="flex-1 h-8"
        autoFocus
      />
      {searchQuery && (
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {totalMatches > 0
            ? t("transcription.matchCount", {
                current: currentMatchIndex + 1,
                total: totalMatches,
              })
            : t("transcription.noResults")}
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrevMatch}
        disabled={totalMatches === 0}
        title={t("transcription.previousMatch")}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNextMatch}
        disabled={totalMatches === 0}
        title={t("transcription.nextMatch")}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClear}
        title={t("transcription.closeSearch")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
