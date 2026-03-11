# Refactoring Plan — React Doctor Remaining Items

Created: 2026-03-10

## Overview

After running React Doctor and fixing all errors (PR #492) and high-impact warnings (PR #493), these items remain as dedicated refactoring work. They are ordered by impact and dependency.

---

## PR 1: Dead Code Cleanup — Unused Files (94 files)

**Risk:** High — static analysis may miss dynamic imports, re-exports, or test references.

**Approach:**

1. Categorize unused files by type (components, hooks, actions, services, scripts, emails)
2. For each file, verify it's truly unused by checking:
   - Dynamic imports (`import()`)
   - Re-exports from index files
   - References in tests
   - Usage in config files (next.config, vercel.json, etc.)
   - MCP server or workflow references
3. Delete in batches by feature area, run build after each batch
4. Prioritize obvious dead code first (old scripts, unused email templates, deprecated providers)

**Files (grouped by area):**

| Category                  | Files                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scripts                   | `auth-schema.ts`, `scripts/add-role-types.ts`, `scripts/check-user-account.ts`, `scripts/fix-missing-account.ts`, `src/scripts/migrate-postgres-to-qdrant.ts`                                                                                                                                                                                                                                                     |
| Deprecated providers      | `src/providers/MicrophoneProvider.tsx` (replaced by `microphone/MicrophoneProvider.tsx`)                                                                                                                                                                                                                                                                                                                          |
| Unused components         | `header-navigation.tsx`, `header.tsx`, `organization-context-display.tsx`, `organization-error-feedback.tsx`, `audio-visualizer.tsx`, `recording-search.tsx`, `recording-summary.tsx`, `create-gmail-draft-button.tsx`, `notification-list.tsx`, `remove-bot-confirm-dialog.tsx`, `task-list.tsx`, `create-calendar-event-button.tsx`                                                                             |
| Unused hooks              | `use-audio-recorder.ts`, `use-debounce.ts`, `use-focus-management.ts`, `use-live-transcription.ts`, `use-consent.ts`, `use-generate-summary-mutation.ts`, `use-passkey-sign-in.ts`, `use-passkey-sign-up.ts`, `use-calendars-query.ts`, `use-extract-tasks-mutation.ts`, `use-scope-check.ts`                                                                                                                     |
| Unused actions            | `vercel-blob.ts`, `create-gmail-draft.ts`, `update-recording-metadata.ts`, `upload-recording.ts`, `google-templates.ts`, `organization-instructions.ts`, `create-calendar-event.ts`, `get-user-tasks.ts`, `start-bot-session.ts`, `get-calendars.ts`, `get-unread-count.ts`, `export-agent-analytics.ts`, `get-admin-users.ts`, `get-agent-metrics.ts`, `invalidate-embedding-cache.ts`, `ensure-organization.ts` |
| Unused services           | `bot-orchestration.service.ts`, `google-gmail.service.ts`, `organization-assignment.service.ts`, `pending-team-assignments.service.ts`, `template.service.ts`, `bot-providers/index.ts`                                                                                                                                                                                                                           |
| Unused server files       | `logger.ts`, `logger-server.ts`, `chat-context.ts`, cache files (`auto-actions.cache.ts`, `chat.cache.ts`, `history.cache.ts`, `task-tags.cache.ts`), `embeddings.queries.ts`, `integration-templates.queries.ts`, `meeting-share-tokens.queries.ts`                                                                                                                                                              |
| Unused validation schemas | Many in `src/server/validation/`                                                                                                                                                                                                                                                                                                                                                                                  |
| Unused DTOs               | `organization.dto.ts`, `user.dto.ts`                                                                                                                                                                                                                                                                                                                                                                              |
| Unused email templates    | `stripe-cancelled.tsx`, `stripe-expired.tsx`, `stripe-paid-started.tsx`, `stripe-trial-started.tsx`, `sign-up-welcome-email.tsx`                                                                                                                                                                                                                                                                                  |
| Workflow inner files      | `src/app/.well-known/workflow/v1/*/inner.js` (3 files) — verify these aren't auto-generated                                                                                                                                                                                                                                                                                                                       |

---

## PR 2: Dead Code Cleanup — Unused Exports (195 exports)

**Risk:** Medium — exports may be used by external consumers or dynamically.

**Approach:**

1. Group by file — many files have just 1 unused export
2. For each export, check if it's part of a public API surface (DTOs, types used by MCP package)
3. Remove exports that are clearly internal-only and unused
4. Run typecheck after each batch to catch cross-package references
5. Remove barrel files from the codebase
6. Skip exports from `@/components/ui/*` (shadcn components may be used later)
7. Skip exports from DTOs used by the MCP package

**Priority files:** `src/lib/logger.ts`, `src/lib/auth.ts`, `src/lib/better-auth-session.ts`, `src/lib/cache-utils.ts`, `src/lib/rate-limit.ts`, service files

---

## PR 3: Component Decomposition — Large Components (12 files, 300+ lines)

**Risk:** Medium — splitting components requires careful state management.

**Approach:**

1. For each large component, identify logical sections that can be extracted
2. Extract into focused sub-components with clear props interfaces
3. Keep state management in the parent, pass handlers down
4. One component per PR if the split is complex

**Files (by priority):**

| File                                                            | Size       | Extraction targets                              |
| --------------------------------------------------------------- | ---------- | ----------------------------------------------- |
| `src/components/ai-elements/prompt-input.tsx`                   | 426+ lines | Speech button, tab labels, action buttons       |
| `src/features/recordings/components/upload-recording-form.tsx`  | 340 lines  | File drop zone, metadata form, progress display |
| `src/features/meetings/components/meeting-details-modal.tsx`    | 300+ lines | Modal sections                                  |
| `src/features/meetings/components/calendar/calendar-view.tsx`   | 300+ lines | Header, grid, event rendering                   |
| `src/features/admin/components/team/team-member-assignment.tsx` | 300+ lines | Search, list, assignment UI                     |
| `src/components/ui/live-waveform.tsx`                           | 300+ lines | Canvas rendering, controls                      |
| `src/features/admin/components/agent/user-analytics-charts.tsx` | 300+ lines | Individual chart sections                       |
| `src/app/(legal)/privacy-policy/page.tsx`                       | 300+ lines | Extract into MDX or sections                    |
| `src/app/(legal)/terms-of-service/page.tsx`                     | 300+ lines | Extract into MDX or sections                    |
| `src/app/(auth)/sign-in/page.tsx`                               | 300+ lines | Form sections                                   |
| `src/app/(auth)/sign-up/page.tsx`                               | 300+ lines | Form sections                                   |
| `src/features/settings/components/data-export.tsx`              | 300+ lines | Export sections                                 |

---

## PR 4: State Management — Too Many useState (20 components)

**Risk:** Medium — useReducer refactors change how state updates work.

**Approach:**

1. For each component with 5+ useState calls, identify related state groups
2. Create a reducer with typed actions for related state
3. Replace useState calls with useReducer
4. Test that all state transitions work correctly

**Priority files (most useState calls first):**

| File                                                                           | useState count |
| ------------------------------------------------------------------------------ | -------------- |
| `src/features/recordings/components/upload-recording-form.tsx`                 | 8              |
| `src/providers/system-audio/SystemAudioProvider.tsx`                           | 5+             |
| `src/providers/microphone/MicrophoneProvider.tsx`                              | 5+             |
| `src/features/recordings/components/edit-summary-dialog.tsx`                   | 5+             |
| `src/features/recordings/components/transcription/transcription-edit-view.tsx` | 5+             |
| `src/features/projects/components/delete-project-dialog.tsx`                   | 5+             |
| `src/features/admin/components/team/team-member-assignment.tsx`                | 5+             |
| `src/features/admin/components/audit/audit-log-viewer.tsx`                     | 5+             |
| `src/features/settings/components/data-export.tsx`                             | 5+             |

---

## Execution Order

1. **PR 1 (Unused files)** — biggest cleanup impact, reduces cognitive load
2. **PR 2 (Unused exports)** — easier after unused files are removed
3. **PR 3 (Component decomposition)** — improves maintainability
4. **PR 4 (State management)** — improves code quality, lowest priority

## Context

- React Doctor score before fixes: **64/100**
- After error fixes (PR #492): **~85/100**
- After warning fixes (PR #493): **~90/100**
- Expected after completing this plan: **95+/100**

