# Feedback Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a feedback widget (thumbs up/down) to recording detail pages and display aggregate feedback in the admin dashboard.

**Architecture:** New `feedback` DB table → data access queries → server action → client widget in `EnhancedSummarySection` → admin stats card + detail page. Follows existing patterns: Drizzle schema, static query class, `authorizedActionClient`, shadcn UI components.

**Tech Stack:** Drizzle ORM, next-safe-action, shadcn/ui, next-intl, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-27-feedback-widget-design.md`

---

## File Structure

| File                                                                    | Action | Purpose                               |
| ----------------------------------------------------------------------- | ------ | ------------------------------------- |
| `src/server/db/schema/feedback.ts`                                      | Create | Drizzle schema for `feedback` table   |
| `src/server/db/schema/index.ts`                                         | Modify | Re-export feedback schema             |
| `src/server/data-access/feedback.queries.ts`                            | Create | CRUD + aggregate queries              |
| `src/server/validation/feedback/submit-feedback.ts`                     | Create | Zod validation schema                 |
| `src/features/recordings/actions/submit-feedback.ts`                    | Create | Server action                         |
| `src/features/recordings/hooks/use-submit-feedback.ts`                  | Create | useAction wrapper hook                |
| `src/features/recordings/components/feedback-widget.tsx`                | Create | Client widget component               |
| `src/features/recordings/components/enhanced-summary-section.tsx`       | Modify | Add FeedbackWidget                    |
| `src/app/(main)/projects/[projectId]/recordings/[recordingId]/page.tsx` | Modify | Load existing feedback                |
| `src/app/(main)/admin/page.tsx`                                         | Modify | Add feedback stats card               |
| `src/app/(main)/admin/feedback/page.tsx`                                | Create | Feedback detail page                  |
| `src/features/admin/components/admin-nav.tsx`                           | Modify | Add Feedback nav item                 |
| `src/features/admin/components/feedback-stats-card.tsx`                 | Create | Stats card for dashboard              |
| `src/features/admin/components/feedback-table.tsx`                      | Create | Filterable table                      |
| `messages/en/recordings.json`                                           | Modify | Add feedback i18n keys                |
| `messages/nl/recordings.json`                                           | Modify | Add Dutch feedback translations       |
| `messages/en/admin.json`                                                | Modify | Add admin feedback i18n keys          |
| `messages/nl/admin.json`                                                | Modify | Add Dutch admin feedback translations |
| `messages/en/adminNav.json`                                             | Modify | Add feedback nav label                |
| `messages/nl/adminNav.json`                                             | Modify | Add Dutch feedback nav label          |

---

### Task 1: Create Feedback Schema

**Files:**

- Create: `src/server/db/schema/feedback.ts`
- Modify: `src/server/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

```typescript
import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { recordings } from "./recordings";

/**
 * Feedback Table
 * Stores user feedback (thumbs up/down) on recording outputs
 * One feedback per user per type per recording
 */
export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    recordingId: uuid("recording_id")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'summary' | 'transcription' | 'general'
    rating: text("rating").notNull(), // 'positive' | 'negative'
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueUserRecordingType: unique().on(
      table.userId,
      table.recordingId,
      table.type,
    ),
    orgIdIdx: index("feedback_org_id_idx").on(table.organizationId),
    recordingIdIdx: index("feedback_recording_id_idx").on(table.recordingId),
  }),
);

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
```

- [ ] **Step 2: Add export to schema index**

Add this line to `src/server/db/schema/index.ts` after the `export * from "./embedding-cache";` line (alphabetical order):

```typescript
export * from "./feedback";
```

- [ ] **Step 3: Generate migration**

Run: `pnpm db:generate --name add-feedback-table`

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema/feedback.ts src/server/db/schema/index.ts drizzle/
git commit -m "feat(feedback): create feedback table schema and migration"
```

---

### Task 2: Create Data Access Layer

**Files:**

- Create: `src/server/data-access/feedback.queries.ts`

- [ ] **Step 1: Create the queries file**

```typescript
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  feedback,
  type Feedback,
  type NewFeedback,
} from "../db/schema/feedback";
import { recordings } from "../db/schema/recordings";

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
}

export class FeedbackQueries {
  static async create(data: NewFeedback): Promise<Feedback> {
    const [result] = await db.insert(feedback).values(data).returning();
    return result;
  }

  static async getByUserAndRecording(
    userId: string,
    recordingId: string,
  ): Promise<Feedback[]> {
    return db
      .select()
      .from(feedback)
      .where(
        and(eq(feedback.userId, userId), eq(feedback.recordingId, recordingId)),
      );
  }

  static async getAggregateStats(
    organizationId: string,
  ): Promise<FeedbackStats> {
    const rows = await db
      .select({
        type: feedback.type,
        rating: feedback.rating,
        count: count(),
      })
      .from(feedback)
      .where(eq(feedback.organizationId, organizationId))
      .groupBy(feedback.type, feedback.rating);

    const stats: FeedbackStats = {
      total: 0,
      positiveCount: 0,
      negativeCount: 0,
      byType: {
        summary: { positive: 0, negative: 0 },
        transcription: { positive: 0, negative: 0 },
        general: { positive: 0, negative: 0 },
      },
    };

    for (const row of rows) {
      const c = row.count;
      stats.total += c;
      if (row.rating === "positive") stats.positiveCount += c;
      if (row.rating === "negative") stats.negativeCount += c;

      const typeKey = row.type as keyof typeof stats.byType;
      if (stats.byType[typeKey]) {
        if (row.rating === "positive") stats.byType[typeKey].positive += c;
        if (row.rating === "negative") stats.byType[typeKey].negative += c;
      }
    }

    return stats;
  }

  static async getByOrganization(
    organizationId: string,
    filters?: FeedbackFilters,
  ): Promise<FeedbackWithRecording[]> {
    const conditions = [eq(feedback.organizationId, organizationId)];

    if (filters?.type) {
      conditions.push(eq(feedback.type, filters.type));
    }
    if (filters?.rating) {
      conditions.push(eq(feedback.rating, filters.rating));
    }

    return db
      .select({
        id: feedback.id,
        organizationId: feedback.organizationId,
        userId: feedback.userId,
        recordingId: feedback.recordingId,
        type: feedback.type,
        rating: feedback.rating,
        comment: feedback.comment,
        createdAt: feedback.createdAt,
        recordingTitle: recordings.title,
      })
      .from(feedback)
      .leftJoin(recordings, eq(feedback.recordingId, recordings.id))
      .where(and(...conditions))
      .orderBy(sql`${feedback.createdAt} DESC`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/data-access/feedback.queries.ts
git commit -m "feat(feedback): add feedback data access queries"
```

---

### Task 3: Create Validation Schema and Server Action

**Files:**

- Create: `src/server/validation/feedback/submit-feedback.ts`
- Create: `src/features/recordings/actions/submit-feedback.ts`
- Create: `src/features/recordings/hooks/use-submit-feedback.ts`

- [ ] **Step 1: Create validation schema**

```typescript
import { z } from "zod";

export const submitFeedbackSchema = z.object({
  recordingId: z.string().uuid(),
  type: z.enum(["summary", "transcription", "general"]),
  rating: z.enum(["positive", "negative"]),
  comment: z.string().max(500).optional(),
});
```

- [ ] **Step 2: Create server action**

```typescript
"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { FeedbackQueries } from "@/server/data-access/feedback.queries";
import { submitFeedbackSchema } from "@/server/validation/feedback/submit-feedback";

export const submitFeedbackAction = authorizedActionClient
  .metadata({
    name: "submit-feedback",
    permissions: policyToPermissions("recordings:read"),
    audit: {
      resourceType: "feedback",
      action: "create",
      category: "mutation",
    },
  })
  .schema(submitFeedbackSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.unauthenticated(
        "User and organization context required",
      );
    }

    logger.info("Submitting feedback", {
      component: "submit-feedback",
      userId: user.id,
      recordingId: parsedInput.recordingId,
      type: parsedInput.type,
      rating: parsedInput.rating,
    });

    try {
      await FeedbackQueries.create({
        organizationId,
        userId: user.id,
        recordingId: parsedInput.recordingId,
        type: parsedInput.type,
        rating: parsedInput.rating,
        comment: parsedInput.comment,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("unique constraint")
      ) {
        throw ActionErrors.conflict(
          "You have already submitted feedback for this type",
        );
      }
      throw ActionErrors.internal(
        "Failed to submit feedback",
        error,
        "submit-feedback",
      );
    }

    return { success: true };
  });
```

- [ ] **Step 3: Create hook**

```typescript
"use client";

import { submitFeedbackAction } from "@/features/recordings/actions/submit-feedback";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function useSubmitFeedback() {
  const t = useTranslations("recordings.feedback");

  const { execute, isExecuting } = useAction(submitFeedbackAction, {
    onSuccess: () => {
      toast.success(t("feedbackSubmitted"));
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t("submitError"));
    },
  });

  return { execute, isExecuting };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/server/validation/feedback/ src/features/recordings/actions/submit-feedback.ts src/features/recordings/hooks/use-submit-feedback.ts
git commit -m "feat(feedback): add validation schema, server action, and submit hook"
```

---

### Task 4: Create Feedback Widget Component

**Files:**

- Create: `src/features/recordings/components/feedback-widget.tsx`

- [ ] **Step 1: Create the widget**

Build a client component with:

- Props: `recordingId: string`, `organizationId: string`, `existingFeedback: Array<{ type: string; rating: string; comment: string | null }>`
- Pill toggle for type (Summary | Transcription | General) using shadcn Button with `variant="outline"` and `variant="default"` for selected
- ThumbsUp and ThumbsDown icons from lucide-react
- On thumb click: call `useSubmitFeedback().execute()`, optimistically update local state
- If existing feedback exists for selected type: show filled thumb, disable interaction
- After thumb click: slide in textarea for optional comment (if not already submitted)
- Use `useTranslations("recordings.feedback")` for all strings
- Accessible: `aria-label` on thumb buttons, `role="group"` on pill selector

The component should be compact — a single row with pills and thumbs, expanding to show the comment field when needed.

- [ ] **Step 2: Commit**

```bash
git add src/features/recordings/components/feedback-widget.tsx
git commit -m "feat(feedback): add feedback widget component with thumbs up/down and type selector"
```

---

### Task 5: Integrate Widget into Recording Detail Page

**Files:**

- Modify: `src/features/recordings/components/enhanced-summary-section.tsx`
- Modify: `src/app/(main)/projects/[projectId]/recordings/[recordingId]/page.tsx`

- [ ] **Step 1: Add FeedbackWidget to EnhancedSummarySection**

The component's props interface needs to accept `feedbackWidgetProps` (or render the widget directly). Add the `FeedbackWidget` import and render it inside the `<CardContent>` block, after the Confidence Score section (after line 286) and before the closing `</CardContent>` at line 287.

Add new props to `EnhancedSummarySection`:

```typescript
recordingId: string;
organizationId: string;
existingFeedback: Array<{
  type: string;
  rating: string;
  comment: string | null;
}>;
```

Render:

```tsx
{
  /* Feedback Widget */
}
<div className="pt-4 border-t">
  <FeedbackWidget
    recordingId={recordingId}
    organizationId={organizationId}
    existingFeedback={existingFeedback}
  />
</div>;
```

- [ ] **Step 2: Load existing feedback in the recording detail page**

In `page.tsx`, import `FeedbackQueries` and load the user's existing feedback for this recording. Pass it to `EnhancedSummarySection` as a prop.

Add to the data loading section:

```typescript
const existingFeedback = user
  ? await FeedbackQueries.getByUserAndRecording(user.id, recordingId)
  : [];
```

Pass to `EnhancedSummarySection`:

```tsx
<EnhancedSummarySection
  recordingId={recordingId}
  summary={summary}
  transcriptionStatus={recording.transcriptionStatus}
  organizationId={recording.organizationId}
  existingFeedback={existingFeedback.map((f) => ({
    type: f.type,
    rating: f.rating,
    comment: f.comment,
  }))}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/features/recordings/components/enhanced-summary-section.tsx src/app/\(main\)/projects/\[projectId\]/recordings/\[recordingId\]/page.tsx
git commit -m "feat(feedback): integrate feedback widget into recording detail page"
```

---

### Task 6: Add i18n Strings

**Files:**

- Modify: `messages/en/recordings.json`
- Modify: `messages/nl/recordings.json`
- Modify: `messages/en/admin.json`
- Modify: `messages/nl/admin.json`
- Modify: `messages/en/adminNav.json`
- Modify: `messages/nl/adminNav.json`

- [ ] **Step 1: Add feedback keys to recordings EN**

Add a `"feedback"` key to `messages/en/recordings.json`:

```json
"feedback": {
  "wasThisHelpful": "Was this helpful?",
  "helpful": "Helpful",
  "notHelpful": "Not helpful",
  "summary": "Summary",
  "transcription": "Transcription",
  "general": "General",
  "commentPlaceholder": "What could be improved? (optional)",
  "submit": "Submit",
  "feedbackSubmitted": "Feedback submitted",
  "alreadySubmitted": "You've already rated this",
  "submitError": "Failed to submit feedback"
}
```

- [ ] **Step 2: Add feedback keys to recordings NL**

Add a `"feedback"` key to `messages/nl/recordings.json`:

```json
"feedback": {
  "wasThisHelpful": "Was dit nuttig?",
  "helpful": "Nuttig",
  "notHelpful": "Niet nuttig",
  "summary": "Samenvatting",
  "transcription": "Transcriptie",
  "general": "Algemeen",
  "commentPlaceholder": "Wat kan er verbeterd worden? (optioneel)",
  "submit": "Verstuur",
  "feedbackSubmitted": "Feedback verstuurd",
  "alreadySubmitted": "Je hebt dit al beoordeeld",
  "submitError": "Feedback versturen mislukt"
}
```

- [ ] **Step 3: Add admin feedback keys to admin EN**

Add a `"feedback"` key to `messages/en/admin.json`:

```json
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
  "noFeedback": "No feedback yet",
  "dashboardDescription": "View user feedback on recordings"
}
```

- [ ] **Step 4: Add admin feedback keys to admin NL**

Add a `"feedback"` key to `messages/nl/admin.json`:

```json
"feedback": {
  "title": "Feedback",
  "description": "Gebruikersfeedback op AI-gegenereerde inhoud",
  "totalFeedback": "Totale Feedback",
  "positiveRate": "Positief Percentage",
  "byType": "Per Type",
  "viewAll": "Bekijk alle feedback",
  "date": "Datum",
  "user": "Gebruiker",
  "recording": "Opname",
  "type": "Type",
  "rating": "Beoordeling",
  "comment": "Opmerking",
  "filterByType": "Filter op type",
  "filterByRating": "Filter op beoordeling",
  "all": "Alle",
  "positive": "Positief",
  "negative": "Negatief",
  "noFeedback": "Nog geen feedback",
  "dashboardDescription": "Bekijk gebruikersfeedback op opnames"
}
```

- [ ] **Step 5: Add nav label to adminNav EN and NL**

In `messages/en/adminNav.json`, add:

```json
"feedback": "Feedback"
```

In `messages/nl/adminNav.json`, add:

```json
"feedback": "Feedback"
```

- [ ] **Step 6: Commit**

```bash
git add messages/
git commit -m "feat(feedback): add i18n strings for feedback widget and admin pages (EN + NL)"
```

---

### Task 7: Create Admin Feedback Stats Card

**Files:**

- Create: `src/features/admin/components/feedback-stats-card.tsx`

- [ ] **Step 1: Create the stats card component**

Server component that receives `stats` prop (FeedbackStats type) and translated strings. Renders a Card with:

- Total feedback count
- Positive rate percentage
- Small breakdown by type (3 rows: summary, transcription, general with positive/negative counts)
- "View all" link to `/admin/feedback`

Uses shadcn `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Badge`. Icons from lucide-react: `ThumbsUp`, `MessageSquare`.

- [ ] **Step 2: Commit**

```bash
git add src/features/admin/components/feedback-stats-card.tsx
git commit -m "feat(feedback): add admin feedback stats card component"
```

---

### Task 8: Integrate Stats Card into Admin Dashboard

**Files:**

- Modify: `src/app/(main)/admin/page.tsx`
- Modify: `src/features/admin/components/admin-nav.tsx`

- [ ] **Step 1: Add feedback stats card to admin dashboard**

Import `FeedbackQueries` and `FeedbackStatsCard`. Load stats in the `AdminDashboard` async function:

```typescript
const feedbackStats = await FeedbackQueries.getAggregateStats(organization.id);
```

Add `FeedbackStatsCard` after the quickLinks grid and before the "Getting Started" card.

- [ ] **Step 2: Add Feedback to admin nav**

In `admin-nav.tsx`, import `MessageSquareIcon` from lucide-react. Add to `BASE_NAV_ITEMS` array:

```typescript
{ href: "/admin/feedback", icon: MessageSquareIcon, labelKey: "feedback" },
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(main\)/admin/page.tsx src/features/admin/components/admin-nav.tsx
git commit -m "feat(feedback): add feedback stats card to admin dashboard and nav"
```

---

### Task 9: Create Admin Feedback Detail Page

**Files:**

- Create: `src/app/(main)/admin/feedback/page.tsx`
- Create: `src/features/admin/components/feedback-table.tsx`

- [ ] **Step 1: Create the feedback table component**

Client component with:

- Props: `feedbackItems` array, translated strings
- Filter pills for type (All | Summary | Transcription | General) and rating (All | Positive | Negative)
- shadcn `Table` with columns: Date, Recording, Type (Badge), Rating (ThumbsUp/Down icon), Comment
- Recording title links to the recording detail page
- Uses `useTranslations("admin.feedback")` for labels
- Client-side filtering (data already loaded server-side)

- [ ] **Step 2: Create the feedback detail page**

Server component following the admin page pattern:

- Permission check via `checkPermission(Permissions.admin.all)`
- Auth context via `resolveAuthContext` or `getBetterAuthSession`
- Load data via `FeedbackQueries.getByOrganization(organizationId)`
- Render `FeedbackTable` with the data
- Standard layout: `container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6`
- i18n via `getTranslations("admin.feedback")`
- Wrapped in Suspense with skeleton fallback

- [ ] **Step 3: Commit**

```bash
git add src/app/\(main\)/admin/feedback/page.tsx src/features/admin/components/feedback-table.tsx
git commit -m "feat(feedback): add admin feedback detail page with filterable table"
```

---

### Task 10: Build Verification

- [ ] **Step 1: Run TypeScript type check**

Run: `pnpm tsc --noEmit`
Expected: No new type errors in changed files

- [ ] **Step 2: Run linter**

Run: `pnpm lint`
Expected: No new lint errors in changed files

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Fix any issues found**

If any type/lint/build errors in our files, fix them and commit.
