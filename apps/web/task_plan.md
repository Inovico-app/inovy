# Task: Complete Dutch UI Translation (INO2-549)

## Goal

Replace EVERY hardcoded static text string in the entire application with next-intl translation calls. No English or Dutch hardcoded text should remain — all UI text must go through the i18n system.

## Approach

Use subagents to scan and update files in parallel batches. Each batch covers a feature area.

## Phases

### Phase 1: Inventory — Scan ALL hardcoded strings `[pending]`

- Use subagents to scan every feature area in parallel
- Categorize strings by namespace (nav, dashboard, recordings, meetings, etc.)
- Output: complete string inventory → findings.md

### Phase 2: Expand message files `[pending]`

- Add all discovered strings to messages/nl.json and messages/en.json
- Organize by namespace matching the feature structure
- Validate JSON is valid

### Phase 3: Update navigation & layout components `[pending]`

- src/lib/navigation.ts — change labels to translation keys
- src/components/sidebar.tsx — use useTranslations
- src/components/header-navigation.tsx — use useTranslations
- Admin nav, settings nav

### Phase 4: Update dashboard components `[pending]`

- src/app/(main)/page.tsx
- src/features/dashboard/components/_ (all dashboard-_ files)

### Phase 5: Update recordings & meetings `[pending]`

- src/app/(main)/recordings/
- src/features/recordings/components/\*
- src/app/(main)/meetings/
- src/features/meetings/components/\*

### Phase 6: Update settings & admin `[pending]`

- src/features/settings/\*\*
- src/app/(main)/settings/\*\*
- Admin pages (already partly Dutch from compliance work)

### Phase 7: Update remaining pages `[pending]`

- Auth pages (sign-in, sign-up, onboarding)
- Projects, tasks, chat, teams
- Error pages, legal pages
- Any remaining hardcoded strings

### Phase 8: Verify & cleanup `[pending]`

- Grep for remaining hardcoded English strings
- Lint, typecheck, test
- Run /simplify review
- Create PR

## Errors Encountered

(none yet)
