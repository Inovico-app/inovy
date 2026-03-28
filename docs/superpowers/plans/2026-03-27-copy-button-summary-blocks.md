# Copy Button for Summary Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-block Markdown copy buttons and a "Copy All" button to the AI-generated summary card.

**Architecture:** A pure formatting utility converts each summary block to Markdown. A shared `useCopyToClipboard` hook manages clipboard + UI state. A `CopyBlockButton` component renders the ghost icon button with Copy/Check toggle. These compose into the existing `EnhancedSummarySection`.

**Tech Stack:** React 19, TypeScript, next-intl, lucide-react, sonner, @base-ui/react tooltip, vitest

---

## File Structure

### New Files

| File                                                                    | Responsibility                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------- |
| `src/features/recordings/lib/format-summary-markdown.ts`                | Pure functions: block → Markdown, full summary → Markdown |
| `src/features/recordings/lib/__tests__/format-summary-markdown.test.ts` | Unit tests for formatting                                 |
| `src/features/recordings/hooks/use-copy-to-clipboard.ts`                | Shared hook: clipboard write + isCopied toggle + toasts   |
| `src/features/recordings/components/copy-block-button.tsx`              | Ghost icon button with tooltip, Copy/Check toggle         |

### Modified Files

| File                                                              | Change                                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/features/recordings/components/enhanced-summary-section.tsx` | Add CopyBlockButton to each AI block header + Copy All in card header |
| `messages/en/recordings.json`                                     | Add 8 copy-related translation keys under `summary`                   |
| `messages/nl/recordings.json`                                     | Add 8 copy-related translation keys under `summary`                   |

---

### Task 1: Markdown Formatting Utility — Tests

**Files:**

- Create: `src/features/recordings/lib/__tests__/format-summary-markdown.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { describe, expect, it } from "vitest";
import {
  formatBlockAsMarkdown,
  formatFullSummaryAsMarkdown,
} from "../format-summary-markdown";

describe("formatBlockAsMarkdown", () => {
  it("formats overview as markdown heading + paragraph", () => {
    const result = formatBlockAsMarkdown("overview", "This is the overview.");
    expect(result).toBe("## Overview\n\nThis is the overview.");
  });

  it("formats topics as markdown heading + bullet list", () => {
    const result = formatBlockAsMarkdown("topics", ["Topic A", "Topic B"]);
    expect(result).toBe("## Key Topics\n\n- Topic A\n- Topic B");
  });

  it("formats decisions as markdown heading + checkmark list", () => {
    const result = formatBlockAsMarkdown("decisions", [
      "Decision 1",
      "Decision 2",
    ]);
    expect(result).toBe(
      "## Decisions\n\n- \u2705 Decision 1\n- \u2705 Decision 2",
    );
  });

  it("formats speaker contributions with sub-headings", () => {
    const result = formatBlockAsMarkdown("speakerContributions", [
      { speaker: "Alice", contributions: ["Point 1", "Point 2"] },
      { speaker: "Bob", contributions: ["Point 3"] },
    ]);
    expect(result).toBe(
      "## Speaker Contributions\n\n### Alice\n- Point 1\n- Point 2\n\n### Bob\n- Point 3",
    );
  });

  it("formats important quotes as blockquotes with attribution", () => {
    const result = formatBlockAsMarkdown("importantQuotes", [
      { speaker: "Alice", quote: "Great idea", startTime: 120 },
      { speaker: "Bob", quote: "I agree" },
    ]);
    expect(result).toBe(
      '## Important Quotes\n\n> "Great idea" \u2014 Alice\n\n> "I agree" \u2014 Bob',
    );
  });

  it("returns empty string for empty overview", () => {
    const result = formatBlockAsMarkdown("overview", "");
    expect(result).toBe("");
  });

  it("returns empty string for empty array blocks", () => {
    expect(formatBlockAsMarkdown("topics", [])).toBe("");
    expect(formatBlockAsMarkdown("decisions", [])).toBe("");
    expect(formatBlockAsMarkdown("speakerContributions", [])).toBe("");
    expect(formatBlockAsMarkdown("importantQuotes", [])).toBe("");
  });
});

describe("formatFullSummaryAsMarkdown", () => {
  it("combines all non-empty blocks with double newlines", () => {
    const content = {
      overview: "Meeting overview",
      topics: ["Topic 1"],
      decisions: ["Decision 1"],
      speakerContributions: [{ speaker: "Alice", contributions: ["Did X"] }],
      importantQuotes: [{ speaker: "Alice", quote: "Nice" }],
    };
    const result = formatFullSummaryAsMarkdown(content);
    expect(result).toContain("## Overview\n\nMeeting overview");
    expect(result).toContain("## Key Topics\n\n- Topic 1");
    expect(result).toContain("## Decisions\n\n- \u2705 Decision 1");
    expect(result).toContain("## Speaker Contributions\n\n### Alice\n- Did X");
    expect(result).toContain('## Important Quotes\n\n> "Nice" \u2014 Alice');
  });

  it("skips empty blocks", () => {
    const content = {
      overview: "Only overview",
      topics: [],
      decisions: [],
      speakerContributions: [],
      importantQuotes: [],
    };
    const result = formatFullSummaryAsMarkdown(content);
    expect(result).toBe("## Overview\n\nOnly overview");
  });

  it("returns empty string when all blocks are empty", () => {
    const content = {
      overview: "",
      topics: [],
      decisions: [],
      speakerContributions: [],
      importantQuotes: [],
    };
    const result = formatFullSummaryAsMarkdown(content);
    expect(result).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run src/features/recordings/lib/__tests__/format-summary-markdown.test.ts`

Expected: FAIL — module `../format-summary-markdown` not found.

---

### Task 2: Markdown Formatting Utility — Implementation

**Files:**

- Create: `src/features/recordings/lib/format-summary-markdown.ts`

- [ ] **Step 1: Implement the formatting functions**

```typescript
import type { SummaryContent } from "@/server/cache/summary.cache";

type SpeakerContribution = SummaryContent["speakerContributions"][number];
type ImportantQuote = SummaryContent["importantQuotes"][number];

type BlockType = keyof SummaryContent;

type BlockDataMap = {
  overview: string;
  topics: string[];
  decisions: string[];
  speakerContributions: SpeakerContribution[];
  importantQuotes: ImportantQuote[];
};

function formatOverview(text: string): string {
  if (!text) return "";
  return `## Overview\n\n${text}`;
}

function formatTopics(topics: string[]): string {
  if (topics.length === 0) return "";
  return `## Key Topics\n\n${topics.map((t) => `- ${t}`).join("\n")}`;
}

function formatDecisions(decisions: string[]): string {
  if (decisions.length === 0) return "";
  return `## Decisions\n\n${decisions.map((d) => `- \u2705 ${d}`).join("\n")}`;
}

function formatSpeakerContributions(speakers: SpeakerContribution[]): string {
  if (speakers.length === 0) return "";
  const sections = speakers.map(
    (s) =>
      `### ${s.speaker}\n${s.contributions.map((c) => `- ${c}`).join("\n")}`,
  );
  return `## Speaker Contributions\n\n${sections.join("\n\n")}`;
}

function formatImportantQuotes(quotes: ImportantQuote[]): string {
  if (quotes.length === 0) return "";
  const formatted = quotes.map((q) => `> "${q.quote}" \u2014 ${q.speaker}`);
  return `## Important Quotes\n\n${formatted.join("\n\n")}`;
}

export function formatBlockAsMarkdown<T extends BlockType>(
  blockType: T,
  data: BlockDataMap[T],
): string {
  switch (blockType) {
    case "overview":
      return formatOverview(data as string);
    case "topics":
      return formatTopics(data as string[]);
    case "decisions":
      return formatDecisions(data as string[]);
    case "speakerContributions":
      return formatSpeakerContributions(data as SpeakerContribution[]);
    case "importantQuotes":
      return formatImportantQuotes(data as ImportantQuote[]);
    default:
      return "";
  }
}

export function formatFullSummaryAsMarkdown(content: SummaryContent): string {
  const blocks = [
    formatOverview(content.overview),
    formatTopics(content.topics),
    formatDecisions(content.decisions),
    formatSpeakerContributions(content.speakerContributions),
    formatImportantQuotes(content.importantQuotes),
  ].filter(Boolean);

  return blocks.join("\n\n");
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run src/features/recordings/lib/__tests__/format-summary-markdown.test.ts`

Expected: All 10 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/recordings/lib/format-summary-markdown.ts src/features/recordings/lib/__tests__/format-summary-markdown.test.ts
git commit -m "feat(recordings): add markdown formatting utility for summary blocks (INO2-564)"
```

---

### Task 3: useCopyToClipboard Hook

**Files:**

- Create: `src/features/recordings/hooks/use-copy-to-clipboard.ts`

- [ ] **Step 1: Create the hook**

```typescript
"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface UseCopyToClipboardReturn {
  isCopied: boolean;
  copyToClipboard: (text: string) => Promise<void>;
}

export function useCopyToClipboard(timeout = 2000): UseCopyToClipboardReturn {
  const t = useTranslations("recordings");
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyToClipboard = useCallback(
    async (text: string) => {
      if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
        toast.error(t("summary.copyFailed"));
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast.success(t("summary.copied"));

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => setIsCopied(false), timeout);
      } catch {
        toast.error(t("summary.copyFailed"));
      }
    },
    [t, timeout],
  );

  return { isCopied, copyToClipboard };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/recordings/hooks/use-copy-to-clipboard.ts
git commit -m "feat(recordings): add useCopyToClipboard hook (INO2-564)"
```

---

### Task 4: CopyBlockButton Component

**Files:**

- Create: `src/features/recordings/components/copy-block-button.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard";

interface CopyBlockButtonProps {
  text: string;
  label: string;
}

export function CopyBlockButton({ text, label }: CopyBlockButtonProps) {
  const t = useTranslations("recordings");
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const handleClick = useCallback(() => {
    void copyToClipboard(text);
  }, [copyToClipboard, text]);

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-50 hover:opacity-100 transition-opacity print:hidden"
            onClick={handleClick}
            aria-label={label}
          />
        }
      >
        <span aria-live="polite" className="sr-only">
          {isCopied ? t("summary.copied") : label}
        </span>
        <Icon className="size-3" />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/recordings/components/copy-block-button.tsx
git commit -m "feat(recordings): add CopyBlockButton component (INO2-564)"
```

---

### Task 5: Translation Keys

**Files:**

- Modify: `messages/en/recordings.json:55` (add keys before closing `}` of summary object)
- Modify: `messages/nl/recordings.json:55` (same location)

- [ ] **Step 1: Add English translation keys**

In `messages/en/recordings.json`, add these keys inside the `"summary"` object, after the `"confidence"` key (line 55):

```json
    "confidence": "{value}% confidence",
    "copyOverview": "Copy overview",
    "copyTopics": "Copy key topics",
    "copyDecisions": "Copy decisions",
    "copySpeakerContributions": "Copy speaker contributions",
    "copyImportantQuotes": "Copy important quotes",
    "copyAll": "Copy full summary",
    "copied": "Copied to clipboard",
    "copyFailed": "Failed to copy"
```

- [ ] **Step 2: Add Dutch translation keys**

In `messages/nl/recordings.json`, add these keys inside the `"summary"` object, after the `"confidence"` key (line 55):

```json
    "confidence": "{value}% vertrouwen",
    "copyOverview": "Overzicht kopi\u00ebren",
    "copyTopics": "Onderwerpen kopi\u00ebren",
    "copyDecisions": "Besluiten kopi\u00ebren",
    "copySpeakerContributions": "Bijdragen kopi\u00ebren",
    "copyImportantQuotes": "Citaten kopi\u00ebren",
    "copyAll": "Volledige samenvatting kopi\u00ebren",
    "copied": "Gekopieerd naar klembord",
    "copyFailed": "Kopiëren mislukt"
```

- [ ] **Step 3: Commit**

```bash
git add messages/en/recordings.json messages/nl/recordings.json
git commit -m "feat(recordings): add copy button translation keys for en/nl (INO2-564)"
```

---

### Task 6: Integrate into EnhancedSummarySection

**Files:**

- Modify: `src/features/recordings/components/enhanced-summary-section.tsx`

This is the largest task. It modifies the existing component to wire in the copy buttons.

- [ ] **Step 1: Add imports**

Add these imports at the top of `enhanced-summary-section.tsx`:

```typescript
import { CopyBlockButton } from "./copy-block-button";
import {
  formatBlockAsMarkdown,
  formatFullSummaryAsMarkdown,
} from "../lib/format-summary-markdown";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard";
```

Also update the existing lucide import to include `Copy`:

```typescript
import { CheckCircle2Icon, ChevronDown, Copy } from "lucide-react";
```

Wait — `Copy` is already not imported. Add it to the lucide import line.

- [ ] **Step 2: Add "Copy All" button in CardHeader**

Inside the component, add a `useCopyToClipboard` call at the top of the function body (alongside existing hooks):

```typescript
const { isCopied: isAllCopied, copyToClipboard: copyAll } =
  useCopyToClipboard();
```

Then, in the `CardHeader`, add a Copy All button in the `print:hidden` div (line 80), before `SummaryVersionHistoryDialog`:

```tsx
<div className="flex items-center gap-2 print:hidden">
  <Button
    variant="ghost"
    size="sm"
    className="opacity-50 hover:opacity-100 transition-opacity"
    onClick={() => void copyAll(formatFullSummaryAsMarkdown(summary.content))}
    aria-label={t("summary.copyAll")}
  >
    <Copy className="size-3.5" />
    {t("summary.copyAll")}
  </Button>
  <SummaryVersionHistoryDialog recordingId={recordingId} />
  <EditSummaryDialog recordingId={recordingId} summary={summary.content} />
</div>
```

- [ ] **Step 3: Add CopyBlockButton to Overview section**

Replace the `CollapsibleTrigger` for Overview (lines 93-102) with:

```tsx
<div className="flex items-center gap-1">
  <CollapsibleTrigger className="flex flex-1 items-center justify-between group hover:bg-muted/50 p-2 rounded-md print:bg-transparent">
    <h3 className="font-semibold text-base">{t("summary.overview")}</h3>
    <ChevronDown
      className={`h-4 w-4 transition-transform print:hidden ${
        overviewOpen ? "rotate-180" : ""
      }`}
    />
  </CollapsibleTrigger>
  <CopyBlockButton
    text={formattedBlocks.overview}
    label={t("summary.copyOverview")}
  />
</div>
```

- [ ] **Step 4: Add CopyBlockButton to Key Topics section**

Replace the `CollapsibleTrigger` for Key Topics (lines 114-123) with:

```tsx
<div className="flex items-center gap-1">
  <CollapsibleTrigger className="flex flex-1 items-center justify-between group hover:bg-muted/50 p-2 rounded-md print:bg-transparent">
    <h3 className="font-semibold text-base">
      Key Topics ({summary.content.topics.length})
    </h3>
    <ChevronDown
      className={`h-4 w-4 transition-transform print:hidden ${
        topicsOpen ? "rotate-180" : ""
      }`}
    />
  </CollapsibleTrigger>
  <CopyBlockButton
    text={formattedBlocks.topics}
    label={t("summary.copyTopics")}
  />
</div>
```

- [ ] **Step 5: Add CopyBlockButton to Decisions section**

Replace the `CollapsibleTrigger` for Decisions (lines 143-152) with:

```tsx
<div className="flex items-center gap-1">
  <CollapsibleTrigger className="flex flex-1 items-center justify-between group hover:bg-muted/50 p-2 rounded-md print:bg-transparent">
    <h3 className="font-semibold text-base">
      Decisions ({summary.content.decisions.length})
    </h3>
    <ChevronDown
      className={`h-4 w-4 transition-transform print:hidden ${
        decisionsOpen ? "rotate-180" : ""
      }`}
    />
  </CollapsibleTrigger>
  <CopyBlockButton
    text={formattedBlocks.decisions}
    label={t("summary.copyDecisions")}
  />
</div>
```

- [ ] **Step 6: Add CopyBlockButton to Speaker Contributions section**

Replace the `CollapsibleTrigger` for Speaker Contributions (lines 176-186) with:

```tsx
<div className="flex items-center gap-1">
  <CollapsibleTrigger className="flex flex-1 items-center justify-between group hover:bg-muted/50 p-2 rounded-md print:bg-transparent">
    <h3 className="font-semibold text-base">
      Speaker Contributions ({summary.content.speakerContributions.length})
    </h3>
    <ChevronDown
      className={`h-4 w-4 transition-transform print:hidden ${
        contributionsOpen ? "rotate-180" : ""
      }`}
    />
  </CollapsibleTrigger>
  <CopyBlockButton
    text={formattedBlocks.speakerContributions}
    label={t("summary.copySpeakerContributions")}
  />
</div>
```

- [ ] **Step 7: Add CopyBlockButton to Important Quotes section**

Replace the `CollapsibleTrigger` for Important Quotes (lines 215-224) with:

```tsx
<div className="flex items-center gap-1">
  <CollapsibleTrigger className="flex flex-1 items-center justify-between group hover:bg-muted/50 p-2 rounded-md print:bg-transparent">
    <h3 className="font-semibold text-base">
      Important Quotes ({summary.content.importantQuotes.length})
    </h3>
    <ChevronDown
      className={`h-4 w-4 transition-transform print:hidden ${
        quotesOpen ? "rotate-180" : ""
      }`}
    />
  </CollapsibleTrigger>
  <CopyBlockButton
    text={formattedBlocks.importantQuotes}
    label={t("summary.copyImportantQuotes")}
  />
</div>
```

- [ ] **Step 8: Verify no lint/type errors**

Run: `cd apps/web && pnpm tsc --noEmit`

Expected: No type errors.

- [ ] **Step 9: Commit**

```bash
git add src/features/recordings/components/enhanced-summary-section.tsx
git commit -m "feat(recordings): integrate copy buttons into summary blocks and card header (INO2-564)"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run all recording tests**

Run: `cd apps/web && pnpm vitest run`

Expected: All tests pass, including the new format-summary-markdown tests.

- [ ] **Step 2: Run linter**

Run: `cd apps/web && pnpm lint`

Expected: No errors.

- [ ] **Step 3: Run type check**

Run: `cd apps/web && pnpm tsc --noEmit`

Expected: No type errors.

- [ ] **Step 4: Verify build**

Run: `pnpm build --filter=web`

Expected: Build succeeds.
