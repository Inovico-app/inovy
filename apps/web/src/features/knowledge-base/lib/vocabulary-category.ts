import type { VocabularyCategory } from "@/server/db/schema/knowledge-base-entries";

export const VOCABULARY_CATEGORIES = [
  "medical",
  "legal",
  "technical",
  "custom",
] as const;

export const CATEGORY_CONFIG: Record<
  VocabularyCategory,
  { label: string; color: string }
> = {
  medical: {
    label: "Medical",
    color:
      "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950 dark:border-blue-800",
  },
  legal: {
    label: "Legal",
    color:
      "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800",
  },
  technical: {
    label: "Technical",
    color:
      "text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-900 dark:border-slate-700",
  },
  custom: {
    label: "Custom",
    color:
      "text-neutral-600 bg-neutral-50 border-neutral-200 dark:text-neutral-400 dark:bg-neutral-900 dark:border-neutral-700",
  },
};
