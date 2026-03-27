# Copy Button for Every Block in AI-Generated Summary

**Issue:** INO2-564
**Date:** 2026-03-27
**Status:** Design approved

## Summary

Add a copy-to-clipboard button to each AI-generated summary block (Overview, Key Topics, Decisions, Speaker Contributions, Important Quotes) plus a "Copy All" button in the card header. Content is copied as Markdown. User Notes block is excluded.

## Architecture

### 1. Pure Formatting Utility

**File:** `src/features/recordings/lib/format-summary-markdown.ts`

Two pure functions:

- `formatBlockAsMarkdown(blockType, data) → string` — converts a single block's data to Markdown
- `formatFullSummaryAsMarkdown(content: SummaryContent) → string` — combines all non-empty blocks

Formatting rules:

| Block                 | Markdown Format                                                      |
| --------------------- | -------------------------------------------------------------------- |
| Overview              | `## Overview\n\n{text}`                                              |
| Key Topics            | `## Key Topics\n\n- topic1\n- topic2`                                |
| Decisions             | `## Decisions\n\n- ✅ decision1\n- ✅ decision2`                     |
| Speaker Contributions | `## Speaker Contributions\n\n### Speaker Name\n- contribution1\n...` |
| Important Quotes      | `## Important Quotes\n\n> "quote" — Speaker`                         |

### 2. Shared Copy Hook

**File:** `src/features/recordings/hooks/use-copy-to-clipboard.ts`

```typescript
useCopyToClipboard() → { isCopied: boolean, copyToClipboard: (text: string) => Promise<void> }
```

- Uses `navigator.clipboard.writeText(text)`
- Sets `isCopied = true` for 2 seconds, then resets
- Shows toast on success/failure via sonner
- Stable reference via `useCallback`

### 3. CopyBlockButton Component

**File:** `src/features/recordings/components/copy-block-button.tsx`

```typescript
interface CopyBlockButtonProps {
  text: string; // pre-formatted markdown string
  label: string; // accessible label, e.g. "Copy overview"
}
```

- `Button` with `variant="ghost"`, `size="icon-xs"`
- Subtle: `opacity-50 hover:opacity-100 transition-opacity`
- Icon toggles `Copy` → `Check` (lucide) based on `isCopied`
- `aria-label={label}` for screen readers
- Wrapped in `Tooltip` showing label text
- `print:hidden`
- `onClick` calls `e.stopPropagation()` to avoid toggling the collapsible

### 4. Integration into EnhancedSummarySection

Each `CollapsibleTrigger` header row gets a `CopyBlockButton` between the title and chevron:

```
[Block Title]                    [📋] [▾]
```

The right side becomes a `flex items-center gap-1` group containing the copy button and chevron.

**"Copy All" button** in `CardHeader` next to Edit/History buttons — `variant="ghost"`, `size="sm"`, with `Copy` icon and translated label.

**User Notes block is excluded** from copy buttons.

### 5. i18n

Translation keys in `recordings.json` under `summary`:

- `summary.copyOverview` — "Copy overview"
- `summary.copyTopics` — "Copy key topics"
- `summary.copyDecisions` — "Copy decisions"
- `summary.copySpeakerContributions` — "Copy speaker contributions"
- `summary.copyImportantQuotes` — "Copy important quotes"
- `summary.copyAll` — "Copy full summary"
- `summary.copied` — "Copied to clipboard"
- `summary.copyFailed` — "Failed to copy"

Both `en` and `nl` translation files need updating.

### 6. Accessibility

- `aria-label` on every copy button with specific block name
- `aria-live="polite"` on icon region for state change announcements
- Keyboard operable via native `<button>`
- `e.stopPropagation()` prevents collapsible toggle on copy
- Tooltip for sighted users
- All copy buttons `print:hidden`

## Files to Create

1. `src/features/recordings/lib/format-summary-markdown.ts`
2. `src/features/recordings/hooks/use-copy-to-clipboard.ts`
3. `src/features/recordings/components/copy-block-button.tsx`

## Files to Modify

1. `src/features/recordings/components/enhanced-summary-section.tsx` — add copy buttons to each block header + "Copy All" in card header
2. `messages/en/recordings.json` — add copy-related translation keys
3. `messages/nl/recordings.json` — add copy-related translation keys

## Out of Scope

- User Notes copy button (users have direct editor access)
- Rich text / HTML clipboard (Markdown plain text only)
- Copy individual list items within a block
