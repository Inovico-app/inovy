import { Badge } from "@/components/ui/badge";
import type { VocabularyCategory } from "@/server/db/schema/knowledge-base-entries";
import { CATEGORY_CONFIG } from "../lib/vocabulary-category";

interface EntryVocabularyBadgesProps {
  boost: number | null;
  category: VocabularyCategory;
}

export function EntryVocabularyBadges({
  boost,
  category,
}: EntryVocabularyBadgesProps) {
  return (
    <>
      {boost != null && (
        <Badge variant="outline" className="text-[10px] py-0 font-mono">
          {boost}x
        </Badge>
      )}
      {category && category !== "custom" && (
        <Badge
          variant="outline"
          className={`text-[10px] py-0 border ${CATEGORY_CONFIG[category].color}`}
        >
          {CATEGORY_CONFIG[category].label}
        </Badge>
      )}
    </>
  );
}
