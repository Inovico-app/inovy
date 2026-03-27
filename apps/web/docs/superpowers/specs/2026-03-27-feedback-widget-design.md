# Feedback Widget and Schema Design

**Issue:** INO2-559
**Date:** 2026-03-27
**Status:** Draft

## Context

Inovy processes meeting recordings through an AI pipeline (transcription, summary, task extraction). Users need a way to rate the quality of these outputs so we can identify issues and improve. This feature adds a feedback widget to the recording detail page and displays aggregate feedback in the admin dashboard.

## Design Decisions

- **Inline widget after summary sections** — compact bar at the bottom of `EnhancedSummarySection`, always visible after viewing summary content
- **3 feedback types** — summary, transcription, general — selectable via pill toggle
- **One-shot per type per recording** — users submit once per type per recording, cannot change. Enforced by unique constraint.
- **Admin dashboard card + detail page** — aggregate stats card on `/admin`, click-through to `/admin/feedback` with filterable table
- **i18n throughout** — all user-facing strings via `next-intl` (`useTranslations` client-side, `getTranslations` server-side) in both `en.json` and `nl.json`
- **No PII in admin display** — show user names from auth context, never emails or IPs

## Section 1: Data Model

### `feedback` table

```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  recording_id UUID NOT NULL REFERENCES recordings(id),
  type TEXT NOT NULL,           -- 'summary' | 'transcription' | 'general'
  rating TEXT NOT NULL,         -- 'positive' | 'negative'
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX feedback_user_recording_type_idx
  ON feedback (user_id, recording_id, type);

CREATE INDEX feedback_org_id_idx ON feedback (organization_id);
CREATE INDEX feedback_recording_id_idx ON feedback (recording_id);
```

Drizzle schema at `src/server/db/schema/feedback.ts`. Types: `Feedback`, `NewFeedback` inferred from schema.

Re-export from `src/server/db/schema/index.ts`.

## Section 2: Feedback Widget

### Component: `FeedbackWidget`

**File:** `src/features/recordings/components/feedback-widget.tsx` (client component)

**Location in page:** Inside `EnhancedSummarySection`, placed after all collapsible summary sections (Overview, Topics, Decisions, Contributions, Quotes).

**Props:**

```typescript
interface FeedbackWidgetProps {
  recordingId: string;
  organizationId: string;
  existingFeedback: Array<{
    type: string;
    rating: string;
    comment: string | null;
  }>;
}
```

**Behavior:**

1. Displays compact inline bar: "Was this helpful?" with pill selector for type (Summary | Transcription | General) and thumbs up/down buttons
2. On thumb click: submits via `useSubmitFeedback` hook. Thumb fills with color (green for positive via `text-emerald-500`, red for negative via `text-destructive`) as confirmation. Success toast via `sonner`.
3. If already submitted for selected type: show filled thumb as read-only, other thumb greyed out. No re-submission allowed.
4. After clicking a thumb, a small textarea slides in below for optional comment. "Submit" button sends comment alongside the already-submitted rating (or as part of the initial submission — comment is included with the rating in a single action call).
5. Existing feedback loaded server-side and passed as props — no client-side data fetching for initial state.

**i18n:** `useTranslations("recordings.feedback")` — keys: `wasThisHelpful`, `helpful`, `notHelpful`, `summary`, `transcription`, `general`, `commentPlaceholder`, `submitComment`, `feedbackSubmitted`, `alreadySubmitted`

### Server Action: `submitFeedbackAction`

**File:** `src/features/recordings/actions/submit-feedback.ts`

Uses `authorizedActionClient` with:

- `metadata.name`: `"submit-feedback"`
- `metadata.permissions`: `policyToPermissions("recording:read")` (any user who can view the recording can leave feedback)
- `metadata.audit`: `{ resourceType: "feedback", action: "create", category: "mutation" }`
- Zod schema validates: `recordingId` (uuid), `type` (enum: summary/transcription/general), `rating` (enum: positive/negative), `comment` (optional string, max 500 chars)
- Inserts into `feedback` table via `FeedbackQueries.create()`
- Returns `{ success: true }`

### Validation Schema

**File:** `src/server/validation/feedback/submit-feedback.ts`

```typescript
export const submitFeedbackSchema = z.object({
  recordingId: z.string().uuid(),
  type: z.enum(["summary", "transcription", "general"]),
  rating: z.enum(["positive", "negative"]),
  comment: z.string().max(500).optional(),
});
```

### Hook: `useSubmitFeedback`

**File:** `src/features/recordings/hooks/use-submit-feedback.ts`

Wraps `useAction(submitFeedbackAction)` with `onSuccess` (toast success) and `onError` (toast error). Exports `execute` and `isExecuting`.

## Section 3: Data Access

### `FeedbackQueries`

**File:** `src/server/data-access/feedback.queries.ts`

Static class following the existing pattern (like `RecordingsQueries`).

**Methods:**

- `create(data: NewFeedback): Promise<Feedback>` — insert feedback
- `getByUserAndRecording(userId: string, recordingId: string): Promise<Feedback[]>` — get user's feedback for a recording (for widget initial state)
- `getAggregateStats(organizationId: string): Promise<FeedbackStats>` — total, positive count, negative count, breakdown by type. For admin dashboard card.
- `getByOrganization(organizationId: string, filters?: FeedbackFilters): Promise<FeedbackWithRecording[]>` — all feedback for org with optional filters (type, rating, date range). Joins with recordings table for title. For admin detail page.

### Types

```typescript
interface FeedbackStats {
  total: number;
  positiveCount: number;
  negativeCount: number;
  byType: {
    summary: { positive: number; negative: number };
    transcription: { positive: number; negative: number };
    general: { positive: number; negative: number };
  };
}

interface FeedbackFilters {
  type?: "summary" | "transcription" | "general";
  rating?: "positive" | "negative";
}

interface FeedbackWithRecording extends Feedback {
  recordingTitle: string | null;
  userName: string | null;
}
```

## Section 4: Admin Dashboard Integration

### Feedback Stats Card

**File:** `src/features/admin/components/feedback-stats-card.tsx` (server component)

Displayed on `/admin/page.tsx` alongside existing quick links. Shows:

- Total feedback count
- Positive rate as percentage (e.g. "87% positive")
- Small breakdown counts by type
- "View all" link to `/admin/feedback`

Uses `Card`, `CardHeader`, `CardTitle`, `CardContent` from shadcn/ui. i18n via props (parent passes translated strings from `getTranslations("admin.feedback")`).

### Admin Dashboard Page Modification

**File:** `src/app/(main)/admin/page.tsx`

Add `FeedbackStatsCard` to the grid alongside existing quick link cards. Load stats via `FeedbackQueries.getAggregateStats(organizationId)`.

### Feedback Detail Page

**File:** `src/app/(main)/admin/feedback/page.tsx` (server component)

- Permission check: `admin.all`
- Loads all feedback for org via `FeedbackQueries.getByOrganization()`
- Renders `FeedbackTable` client component with filter controls
- Standard admin layout: `container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6`
- i18n via `getTranslations("admin.feedback")`

### Feedback Table

**File:** `src/features/admin/components/feedback-table.tsx` (client component)

- Filterable by type (pill selector), rating (positive/negative/all)
- Columns: date, user name, recording title (linked), type badge, rating (thumbs icon), comment
- Uses shadcn `Table` components
- i18n via `useTranslations("admin.feedback")`

### Admin Nav Update

**File:** `src/features/admin/components/admin-nav.tsx`

Add "Feedback" to the base nav items array with icon `MessageSquare` from lucide-react, href `/admin/feedback`.

## Section 5: i18n Strings

### `messages/en.json` additions

```json
{
  "recordings": {
    "feedback": {
      "wasThisHelpful": "Was this helpful?",
      "helpful": "Helpful",
      "notHelpful": "Not helpful",
      "summary": "Summary",
      "transcription": "Transcription",
      "general": "General",
      "commentPlaceholder": "What could be improved? (optional)",
      "submitComment": "Submit",
      "feedbackSubmitted": "Feedback submitted",
      "alreadySubmitted": "You've already rated this"
    }
  },
  "admin": {
    "feedback": {
      "title": "Feedback",
      "description": "User feedback on AI-generated content",
      "totalFeedback": "Total Feedback",
      "positiveRate": "Positive Rate",
      "byType": "By Type",
      "viewAll": "View all feedback",
      "date": "Date",
      "user": "User",
      "recording": "Recording",
      "type": "Type",
      "rating": "Rating",
      "comment": "Comment",
      "filterByType": "Filter by type",
      "filterByRating": "Filter by rating",
      "all": "All",
      "positive": "Positive",
      "negative": "Negative",
      "noFeedback": "No feedback yet"
    }
  }
}
```

### `messages/nl.json` additions

Dutch translations for all the above keys.

## Files Changed Summary

| File                                                                    | Action |
| ----------------------------------------------------------------------- | ------ |
| `src/server/db/schema/feedback.ts`                                      | Create |
| `src/server/db/schema/index.ts`                                         | Modify |
| `src/server/data-access/feedback.queries.ts`                            | Create |
| `src/server/validation/feedback/submit-feedback.ts`                     | Create |
| `src/features/recordings/actions/submit-feedback.ts`                    | Create |
| `src/features/recordings/hooks/use-submit-feedback.ts`                  | Create |
| `src/features/recordings/components/feedback-widget.tsx`                | Create |
| `src/features/recordings/components/enhanced-summary-section.tsx`       | Modify |
| `src/app/(main)/projects/[projectId]/recordings/[recordingId]/page.tsx` | Modify |
| `src/app/(main)/admin/page.tsx`                                         | Modify |
| `src/app/(main)/admin/feedback/page.tsx`                                | Create |
| `src/features/admin/components/admin-nav.tsx`                           | Modify |
| `src/features/admin/components/feedback-stats-card.tsx`                 | Create |
| `src/features/admin/components/feedback-table.tsx`                      | Create |
| `messages/en.json` (recordings + admin sections)                        | Modify |
| `messages/nl.json` (recordings + admin sections)                        | Modify |

## Out of Scope

- Editing/deleting feedback after submission
- Feedback on individual transcript chunks or task items
- Email notifications on negative feedback
- Charts/graphs in admin (counts and table only)
- Feedback export (CSV/PDF)
