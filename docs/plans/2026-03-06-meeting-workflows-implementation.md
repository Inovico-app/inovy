# Meeting Workflows Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build pre/during/post-meeting automation with agenda tracking, AI-driven progress detection, and post-meeting actions.

**Architecture:** New first-class `meetings` table as central hub linking bot sessions, recordings, agendas, and workflows. Polling-based transcript access via Recall.ai API every 5 minutes for agenda tracking. Post-meeting actions triggered after AI workflow completes via webhook service hook.

**Tech Stack:** Drizzle ORM (PostgreSQL), next-safe-action, neverthrow, Zod, OpenAI (structured output), Recall.ai API, Resend (email), Next.js 16 App Router (RSC), Tailwind CSS 4, Shadcn UI.

**Design doc:** `docs/plans/2026-03-06-meeting-workflows-design.md`

---

## Task 1: Database Schema — meetings table

**Files:**
- Create: `apps/web/src/server/db/schema/meetings.ts`
- Modify: `apps/web/src/server/db/schema/index.ts` — add export

**Step 1: Create the meetings schema file**

```typescript
// apps/web/src/server/db/schema/meetings.ts
import { index, jsonb, pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const meetingStatusEnum = [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type MeetingStatus = (typeof meetingStatusEnum)[number];

export interface MeetingParticipant {
  email: string;
  name: string | null;
  role: string | null;
}

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    createdById: text("created_by_id").notNull(),
    calendarEventId: text("calendar_event_id"),
    externalCalendarId: text("external_calendar_id"),
    title: text("title").notNull(),
    description: text("description"),
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }).notNull(),
    scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
    actualStartAt: timestamp("actual_start_at", { withTimezone: true }),
    actualEndAt: timestamp("actual_end_at", { withTimezone: true }),
    status: text("status", { enum: meetingStatusEnum }).notNull().default("scheduled"),
    meetingUrl: text("meeting_url"),
    participants: jsonb("participants").$type<MeetingParticipant[]>().default([]),
    lastAgendaCheckAt: timestamp("last_agenda_check_at", { withTimezone: true }),
    lastTranscriptLength: integer("last_transcript_length").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index("meetings_organization_id_idx").on(table.organizationId),
    calendarEventIdx: index("meetings_calendar_event_id_idx").on(table.calendarEventId),
    statusIdx: index("meetings_status_idx").on(table.organizationId, table.status),
    scheduledIdx: index("meetings_scheduled_start_idx").on(table.organizationId, table.scheduledStartAt),
  })
);

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
```

**Step 2: Add export to schema index**

Add to `apps/web/src/server/db/schema/index.ts`:
```typescript
export * from "./meetings";
```

**Step 3: Commit**
```bash
git add apps/web/src/server/db/schema/meetings.ts apps/web/src/server/db/schema/index.ts
git commit -m "feat: add meetings schema table"
```

---

## Task 2: Database Schema — meeting_agenda_items table

**Files:**
- Create: `apps/web/src/server/db/schema/meeting-agenda-items.ts`
- Modify: `apps/web/src/server/db/schema/index.ts` — add export

**Step 1: Create the meeting agenda items schema file**

```typescript
// apps/web/src/server/db/schema/meeting-agenda-items.ts
import { index, jsonb, pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { meetings } from "./meetings";

export const agendaItemStatusEnum = [
  "pending",
  "in_progress",
  "covered",
  "skipped",
] as const;

export type AgendaItemStatus = (typeof agendaItemStatusEnum)[number];

export const meetingAgendaItems = pgTable(
  "meeting_agenda_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: agendaItemStatusEnum }).notNull().default("pending"),
    coveredAt: timestamp("covered_at", { withTimezone: true }),
    aiSummary: text("ai_summary"),
    aiKeyPoints: jsonb("ai_key_points").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    meetingIdx: index("meeting_agenda_items_meeting_id_idx").on(table.meetingId),
    sortIdx: index("meeting_agenda_items_sort_idx").on(table.meetingId, table.sortOrder),
  })
);

export type MeetingAgendaItem = typeof meetingAgendaItems.$inferSelect;
export type NewMeetingAgendaItem = typeof meetingAgendaItems.$inferInsert;
```

**Step 2: Add export to schema index**

```typescript
export * from "./meeting-agenda-items";
```

**Step 3: Commit**
```bash
git add apps/web/src/server/db/schema/meeting-agenda-items.ts apps/web/src/server/db/schema/index.ts
git commit -m "feat: add meeting_agenda_items schema table"
```

---

## Task 3: Database Schema — meeting_notes, meeting_post_actions, meeting_agenda_templates, meeting_share_tokens

**Files:**
- Create: `apps/web/src/server/db/schema/meeting-notes.ts`
- Create: `apps/web/src/server/db/schema/meeting-post-actions.ts`
- Create: `apps/web/src/server/db/schema/meeting-agenda-templates.ts`
- Create: `apps/web/src/server/db/schema/meeting-share-tokens.ts`
- Modify: `apps/web/src/server/db/schema/index.ts` — add exports

**Step 1: Create meeting-notes schema**

```typescript
// apps/web/src/server/db/schema/meeting-notes.ts
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { meetings } from "./meetings";

export const meetingNoteTypeEnum = [
  "pre_meeting",
  "during_meeting",
  "post_meeting",
] as const;

export type MeetingNoteType = (typeof meetingNoteTypeEnum)[number];

export const meetingNotes = pgTable(
  "meeting_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    createdById: text("created_by_id").notNull(),
    content: text("content").notNull(),
    type: text("type", { enum: meetingNoteTypeEnum }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    meetingIdx: index("meeting_notes_meeting_id_idx").on(table.meetingId),
  })
);

export type MeetingNote = typeof meetingNotes.$inferSelect;
export type NewMeetingNote = typeof meetingNotes.$inferInsert;
```

**Step 2: Create meeting-post-actions schema**

```typescript
// apps/web/src/server/db/schema/meeting-post-actions.ts
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { meetings } from "./meetings";

export const postActionTypeEnum = [
  "send_summary_email",
  "create_tasks",
  "share_recording",
  "generate_followup_agenda",
  "push_external",
] as const;

export type PostActionType = (typeof postActionTypeEnum)[number];

export const postActionStatusEnum = [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
] as const;

export type PostActionStatus = (typeof postActionStatusEnum)[number];

export const meetingPostActions = pgTable(
  "meeting_post_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    type: text("type", { enum: postActionTypeEnum }).notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    status: text("status", { enum: postActionStatusEnum }).notNull().default("pending"),
    result: jsonb("result").$type<Record<string, unknown>>(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    meetingIdx: index("meeting_post_actions_meeting_id_idx").on(table.meetingId),
    statusIdx: index("meeting_post_actions_status_idx").on(table.meetingId, table.status),
  })
);

export type MeetingPostAction = typeof meetingPostActions.$inferSelect;
export type NewMeetingPostAction = typeof meetingPostActions.$inferInsert;
```

**Step 3: Create meeting-agenda-templates schema**

```typescript
// apps/web/src/server/db/schema/meeting-agenda-templates.ts
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export interface AgendaTemplateItem {
  title: string;
  description: string | null;
  sortOrder: number;
}

export const meetingAgendaTemplates = pgTable(
  "meeting_agenda_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    createdById: text("created_by_id"),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    items: jsonb("items").$type<AgendaTemplateItem[]>().notNull().default([]),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index("meeting_agenda_templates_org_idx").on(table.organizationId),
    categoryIdx: index("meeting_agenda_templates_category_idx").on(table.organizationId, table.category),
  })
);

export type MeetingAgendaTemplate = typeof meetingAgendaTemplates.$inferSelect;
export type NewMeetingAgendaTemplate = typeof meetingAgendaTemplates.$inferInsert;
```

**Step 4: Create meeting-share-tokens schema**

```typescript
// apps/web/src/server/db/schema/meeting-share-tokens.ts
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { meetings } from "./meetings";

export const meetingShareTokens = pgTable(
  "meeting_share_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    createdById: text("created_by_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    requiresAuth: boolean("requires_auth").notNull().default(true),
    requiresOrgMembership: boolean("requires_org_membership").notNull().default(true),
    accessedAt: timestamp("accessed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    meetingIdx: index("meeting_share_tokens_meeting_id_idx").on(table.meetingId),
    tokenHashIdx: index("meeting_share_tokens_token_hash_idx").on(table.tokenHash),
  })
);

export type MeetingShareToken = typeof meetingShareTokens.$inferSelect;
export type NewMeetingShareToken = typeof meetingShareTokens.$inferInsert;
```

**Step 5: Add all exports to schema index**

Add to `apps/web/src/server/db/schema/index.ts`:
```typescript
export * from "./meeting-notes";
export * from "./meeting-post-actions";
export * from "./meeting-agenda-templates";
export * from "./meeting-share-tokens";
```

**Step 6: Commit**
```bash
git add apps/web/src/server/db/schema/meeting-notes.ts apps/web/src/server/db/schema/meeting-post-actions.ts apps/web/src/server/db/schema/meeting-agenda-templates.ts apps/web/src/server/db/schema/meeting-share-tokens.ts apps/web/src/server/db/schema/index.ts
git commit -m "feat: add meeting notes, post actions, templates, and share tokens schemas"
```

---

## Task 4: Database Schema — update bot_sessions and recordings with meetingId

**Files:**
- Modify: `apps/web/src/server/db/schema/bot-sessions.ts` — add `meetingId` column
- Modify: `apps/web/src/server/db/schema/recordings.ts` — add `meetingId` column

**Step 1: Add meetingId to bot_sessions**

Add to the bot_sessions table columns (after existing fields, before the closing of the table definition):
```typescript
import { meetings } from "./meetings";

// Add this column
meetingId: uuid("meeting_id").references(() => meetings.id, { onDelete: "set null" }),
```

Add an index in the second argument:
```typescript
meetingIdIdx: index("bot_sessions_meeting_id_idx").on(table.meetingId),
```

**Step 2: Add meetingId to recordings**

Same pattern — add to recordings table:
```typescript
import { meetings } from "./meetings";

// Add this column
meetingId: uuid("meeting_id").references(() => meetings.id, { onDelete: "set null" }),
```

Add an index:
```typescript
meetingIdIdx: index("recordings_meeting_id_idx").on(table.meetingId),
```

**Step 3: Commit**
```bash
git add apps/web/src/server/db/schema/bot-sessions.ts apps/web/src/server/db/schema/recordings.ts
git commit -m "feat: add meetingId FK to bot_sessions and recordings"
```

---

## Task 5: Generate database migration

**Step 1: Generate migration**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm db:generate --name add_meeting_workflows_tables
```

Expected: Migration SQL file created in `apps/web/src/server/db/migrations/`

**Step 2: Review the generated migration file**

Read the generated SQL and verify it includes:
- CREATE TABLE for meetings, meeting_agenda_items, meeting_notes, meeting_post_actions, meeting_agenda_templates, meeting_share_tokens
- ALTER TABLE for bot_sessions and recordings (adding meeting_id column)
- All indexes
- All foreign keys

**Step 3: Commit**
```bash
git add apps/web/src/server/db/migrations/
git commit -m "feat: add migration for meeting workflows tables"
```

---

## Task 6: Data Access Layer — meetings queries

**Files:**
- Create: `apps/web/src/server/data-access/meetings.queries.ts`

**Step 1: Create meetings queries**

Follow the pattern from `bot-sessions.queries.ts`. Include:

```typescript
// apps/web/src/server/data-access/meetings.queries.ts
import { and, desc, eq, gte, inArray, lt, or } from "drizzle-orm";
import { db } from "../db";
import { meetings, type Meeting, type NewMeeting, type MeetingStatus } from "../db/schema/meetings";

export class MeetingsQueries {
  static async insert(data: NewMeeting): Promise<Meeting> {
    const [meeting] = await db.insert(meetings).values(data).returning();
    return meeting;
  }

  static async findById(id: string, organizationId: string): Promise<Meeting | null> {
    const result = await db
      .select()
      .from(meetings)
      .where(and(eq(meetings.id, id), eq(meetings.organizationId, organizationId)))
      .limit(1);
    return result[0] ?? null;
  }

  static async findByCalendarEventId(
    calendarEventId: string,
    organizationId: string
  ): Promise<Meeting | null> {
    const result = await db
      .select()
      .from(meetings)
      .where(
        and(
          eq(meetings.calendarEventId, calendarEventId),
          eq(meetings.organizationId, organizationId)
        )
      )
      .limit(1);
    return result[0] ?? null;
  }

  static async findUpcoming(
    organizationId: string,
    options?: { limit?: number; userId?: string }
  ): Promise<Meeting[]> {
    const now = new Date();
    const conditions = [
      eq(meetings.organizationId, organizationId),
      gte(meetings.scheduledStartAt, now),
      inArray(meetings.status, ["draft", "scheduled"]),
    ];
    if (options?.userId) {
      conditions.push(eq(meetings.createdById, options.userId));
    }
    return db
      .select()
      .from(meetings)
      .where(and(...conditions))
      .orderBy(meetings.scheduledStartAt)
      .limit(options?.limit ?? 50);
  }

  static async findActiveMeetingsWithAgenda(): Promise<Meeting[]> {
    // Used by agenda-check cron: meetings that are in_progress
    return db
      .select()
      .from(meetings)
      .where(eq(meetings.status, "in_progress"));
  }

  static async update(
    id: string,
    organizationId: string,
    data: Partial<Omit<Meeting, "id" | "organizationId" | "createdAt">>
  ): Promise<Meeting | null> {
    const [meeting] = await db
      .update(meetings)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(meetings.id, id), eq(meetings.organizationId, organizationId)))
      .returning();
    return meeting ?? null;
  }
}
```

**Step 2: Commit**
```bash
git add apps/web/src/server/data-access/meetings.queries.ts
git commit -m "feat: add meetings data access layer"
```

---

## Task 7: Data Access Layer — agenda items, notes, post actions, templates, share tokens

**Files:**
- Create: `apps/web/src/server/data-access/meeting-agenda-items.queries.ts`
- Create: `apps/web/src/server/data-access/meeting-notes.queries.ts`
- Create: `apps/web/src/server/data-access/meeting-post-actions.queries.ts`
- Create: `apps/web/src/server/data-access/meeting-agenda-templates.queries.ts`
- Create: `apps/web/src/server/data-access/meeting-share-tokens.queries.ts`

**Step 1: Create meeting-agenda-items queries**

```typescript
// apps/web/src/server/data-access/meeting-agenda-items.queries.ts
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  meetingAgendaItems,
  type MeetingAgendaItem,
  type NewMeetingAgendaItem,
  type AgendaItemStatus,
} from "../db/schema/meeting-agenda-items";

export class MeetingAgendaItemsQueries {
  static async insert(data: NewMeetingAgendaItem): Promise<MeetingAgendaItem> {
    const [item] = await db.insert(meetingAgendaItems).values(data).returning();
    return item;
  }

  static async insertMany(data: NewMeetingAgendaItem[]): Promise<MeetingAgendaItem[]> {
    if (data.length === 0) return [];
    return db.insert(meetingAgendaItems).values(data).returning();
  }

  static async findByMeetingId(meetingId: string): Promise<MeetingAgendaItem[]> {
    return db
      .select()
      .from(meetingAgendaItems)
      .where(eq(meetingAgendaItems.meetingId, meetingId))
      .orderBy(asc(meetingAgendaItems.sortOrder));
  }

  static async findUncheckedByMeetingId(meetingId: string): Promise<MeetingAgendaItem[]> {
    return db
      .select()
      .from(meetingAgendaItems)
      .where(
        and(
          eq(meetingAgendaItems.meetingId, meetingId),
          inArray(meetingAgendaItems.status, ["pending", "in_progress"])
        )
      )
      .orderBy(asc(meetingAgendaItems.sortOrder));
  }

  static async update(
    id: string,
    meetingId: string,
    data: Partial<Omit<MeetingAgendaItem, "id" | "meetingId" | "createdAt">>
  ): Promise<MeetingAgendaItem | null> {
    const [item] = await db
      .update(meetingAgendaItems)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(meetingAgendaItems.id, id), eq(meetingAgendaItems.meetingId, meetingId)))
      .returning();
    return item ?? null;
  }

  static async delete(id: string, meetingId: string): Promise<boolean> {
    const result = await db
      .delete(meetingAgendaItems)
      .where(and(eq(meetingAgendaItems.id, id), eq(meetingAgendaItems.meetingId, meetingId)))
      .returning();
    return result.length > 0;
  }

  static async deleteByMeetingId(meetingId: string): Promise<void> {
    await db.delete(meetingAgendaItems).where(eq(meetingAgendaItems.meetingId, meetingId));
  }
}
```

**Step 2: Create meeting-notes queries**

```typescript
// apps/web/src/server/data-access/meeting-notes.queries.ts
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  meetingNotes,
  type MeetingNote,
  type NewMeetingNote,
  type MeetingNoteType,
} from "../db/schema/meeting-notes";

export class MeetingNotesQueries {
  static async upsert(data: NewMeetingNote): Promise<MeetingNote> {
    // One note per type per meeting per user
    const existing = await db
      .select()
      .from(meetingNotes)
      .where(
        and(
          eq(meetingNotes.meetingId, data.meetingId),
          eq(meetingNotes.createdById, data.createdById),
          eq(meetingNotes.type, data.type)
        )
      )
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(meetingNotes)
        .set({ content: data.content, updatedAt: new Date() })
        .where(eq(meetingNotes.id, existing[0].id))
        .returning();
      return updated;
    }

    const [note] = await db.insert(meetingNotes).values(data).returning();
    return note;
  }

  static async findByMeetingId(meetingId: string): Promise<MeetingNote[]> {
    return db
      .select()
      .from(meetingNotes)
      .where(eq(meetingNotes.meetingId, meetingId))
      .orderBy(desc(meetingNotes.createdAt));
  }

  static async findByMeetingAndType(
    meetingId: string,
    type: MeetingNoteType
  ): Promise<MeetingNote | null> {
    const result = await db
      .select()
      .from(meetingNotes)
      .where(and(eq(meetingNotes.meetingId, meetingId), eq(meetingNotes.type, type)))
      .limit(1);
    return result[0] ?? null;
  }
}
```

**Step 3: Create meeting-post-actions queries**

```typescript
// apps/web/src/server/data-access/meeting-post-actions.queries.ts
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  meetingPostActions,
  type MeetingPostAction,
  type NewMeetingPostAction,
} from "../db/schema/meeting-post-actions";

export class MeetingPostActionsQueries {
  static async insert(data: NewMeetingPostAction): Promise<MeetingPostAction> {
    const [action] = await db.insert(meetingPostActions).values(data).returning();
    return action;
  }

  static async insertMany(data: NewMeetingPostAction[]): Promise<MeetingPostAction[]> {
    if (data.length === 0) return [];
    return db.insert(meetingPostActions).values(data).returning();
  }

  static async findByMeetingId(meetingId: string): Promise<MeetingPostAction[]> {
    return db
      .select()
      .from(meetingPostActions)
      .where(eq(meetingPostActions.meetingId, meetingId));
  }

  static async findPendingByMeetingId(meetingId: string): Promise<MeetingPostAction[]> {
    return db
      .select()
      .from(meetingPostActions)
      .where(
        and(
          eq(meetingPostActions.meetingId, meetingId),
          eq(meetingPostActions.status, "pending")
        )
      );
  }

  static async update(
    id: string,
    data: Partial<Omit<MeetingPostAction, "id" | "meetingId" | "createdAt">>
  ): Promise<MeetingPostAction | null> {
    const [action] = await db
      .update(meetingPostActions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(meetingPostActions.id, id))
      .returning();
    return action ?? null;
  }
}
```

**Step 4: Create meeting-agenda-templates queries**

```typescript
// apps/web/src/server/data-access/meeting-agenda-templates.queries.ts
import { and, eq, or } from "drizzle-orm";
import { db } from "../db";
import {
  meetingAgendaTemplates,
  type MeetingAgendaTemplate,
  type NewMeetingAgendaTemplate,
} from "../db/schema/meeting-agenda-templates";

export class MeetingAgendaTemplatesQueries {
  static async insert(data: NewMeetingAgendaTemplate): Promise<MeetingAgendaTemplate> {
    const [template] = await db.insert(meetingAgendaTemplates).values(data).returning();
    return template;
  }

  static async findAvailable(organizationId: string): Promise<MeetingAgendaTemplate[]> {
    // Return both system templates and org-specific templates
    return db
      .select()
      .from(meetingAgendaTemplates)
      .where(
        or(
          eq(meetingAgendaTemplates.isSystem, true),
          eq(meetingAgendaTemplates.organizationId, organizationId)
        )
      );
  }

  static async findById(id: string): Promise<MeetingAgendaTemplate | null> {
    const result = await db
      .select()
      .from(meetingAgendaTemplates)
      .where(eq(meetingAgendaTemplates.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  static async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(meetingAgendaTemplates)
      .where(
        and(
          eq(meetingAgendaTemplates.id, id),
          eq(meetingAgendaTemplates.organizationId, organizationId)
        )
      )
      .returning();
    return result.length > 0;
  }
}
```

**Step 5: Create meeting-share-tokens queries**

```typescript
// apps/web/src/server/data-access/meeting-share-tokens.queries.ts
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  meetingShareTokens,
  type MeetingShareToken,
  type NewMeetingShareToken,
} from "../db/schema/meeting-share-tokens";

export class MeetingShareTokensQueries {
  static async insert(data: NewMeetingShareToken): Promise<MeetingShareToken> {
    const [token] = await db.insert(meetingShareTokens).values(data).returning();
    return token;
  }

  static async findValidByHash(tokenHash: string): Promise<MeetingShareToken | null> {
    const now = new Date();
    const result = await db
      .select()
      .from(meetingShareTokens)
      .where(
        and(
          eq(meetingShareTokens.tokenHash, tokenHash),
          gt(meetingShareTokens.expiresAt, now),
          isNull(meetingShareTokens.revokedAt)
        )
      )
      .limit(1);
    return result[0] ?? null;
  }

  static async markAccessed(id: string): Promise<void> {
    await db
      .update(meetingShareTokens)
      .set({ accessedAt: new Date() })
      .where(eq(meetingShareTokens.id, id));
  }

  static async revoke(id: string): Promise<void> {
    await db
      .update(meetingShareTokens)
      .set({ revokedAt: new Date() })
      .where(eq(meetingShareTokens.id, id));
  }
}
```

**Step 6: Commit**
```bash
git add apps/web/src/server/data-access/meeting-agenda-items.queries.ts apps/web/src/server/data-access/meeting-notes.queries.ts apps/web/src/server/data-access/meeting-post-actions.queries.ts apps/web/src/server/data-access/meeting-agenda-templates.queries.ts apps/web/src/server/data-access/meeting-share-tokens.queries.ts
git commit -m "feat: add data access layer for all meeting-related tables"
```

---

## Task 8: Cache tags for meetings

**Files:**
- Modify: `apps/web/src/lib/cache-utils.ts` — add meeting cache tags and invalidation methods

**Step 1: Add meeting cache tags**

Add to the `CacheTags` object:
```typescript
// Meeting tags
meetings: (organizationId: string) => `meetings:org:${organizationId}`,
meeting: (meetingId: string) => `meeting:${meetingId}`,
meetingAgendaItems: (meetingId: string) => `meeting-agenda-items:${meetingId}`,
meetingNotes: (meetingId: string) => `meeting-notes:${meetingId}`,
meetingPostActions: (meetingId: string) => `meeting-post-actions:${meetingId}`,
meetingTemplates: (organizationId: string) => `meeting-templates:org:${organizationId}`,
```

Add to `CacheInvalidation`:
```typescript
static invalidateMeetings(organizationId: string) {
  revalidateTag(CacheTags.meetings(organizationId));
}

static invalidateMeeting(meetingId: string) {
  revalidateTag(CacheTags.meeting(meetingId));
}

static invalidateMeetingAgendaItems(meetingId: string) {
  revalidateTag(CacheTags.meetingAgendaItems(meetingId));
}

static invalidateMeetingNotes(meetingId: string) {
  revalidateTag(CacheTags.meetingNotes(meetingId));
}
```

**Step 2: Commit**
```bash
git add apps/web/src/lib/cache-utils.ts
git commit -m "feat: add meeting cache tags and invalidation"
```

---

## Task 9: Recall API — add getTranscript and sendChatMessage methods

**Files:**
- Modify: `apps/web/src/server/services/recall-api.service.ts`

**Step 1: Add getTranscript method**

Add to `RecallApiService`:
```typescript
/**
 * Get the current transcript for an active bot session
 */
static async getTranscript(
  botId: string
): Promise<ActionResult<{ transcript: Array<{ speaker: string; words: Array<{ text: string; start_time: number; end_time: number }> }> }>> {
  try {
    const apiKey = getRecallApiKey();
    const response = await fetch(`${this.API_BASE_URL}/bot/${botId}/transcript/`, {
      method: "GET",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Failed to get transcript from Recall.ai", {
        component: "RecallApiService",
        botId,
        status: response.status,
        error: errorText,
      });
      return err(ActionErrors.internal(`Failed to get transcript: ${response.status}`));
    }

    const data = await response.json();
    return ok({ transcript: data });
  } catch (error) {
    logger.error("Error getting transcript from Recall.ai", {
      component: "RecallApiService",
      botId,
    }, error as Error);
    return err(ActionErrors.internal("Failed to get transcript", error));
  }
}
```

**Step 2: Add sendChatMessage method**

```typescript
/**
 * Send a chat message to the meeting via the bot
 */
static async sendChatMessage(
  botId: string,
  message: string
): Promise<ActionResult<void>> {
  try {
    const apiKey = getRecallApiKey();
    const response = await fetch(`${this.API_BASE_URL}/bot/${botId}/send_chat_message/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Failed to send chat message via Recall.ai", {
        component: "RecallApiService",
        botId,
        status: response.status,
        error: errorText,
      });
      return err(ActionErrors.internal(`Failed to send chat message: ${response.status}`));
    }

    return ok(undefined);
  } catch (error) {
    logger.error("Error sending chat message via Recall.ai", {
      component: "RecallApiService",
      botId,
    }, error as Error);
    return err(ActionErrors.internal("Failed to send chat message", error));
  }
}
```

**Step 3: Commit**
```bash
git add apps/web/src/server/services/recall-api.service.ts
git commit -m "feat: add getTranscript and sendChatMessage to RecallApiService"
```

---

## Task 10: MeetingService — core meeting CRUD

**Files:**
- Create: `apps/web/src/server/services/meeting.service.ts`

**Step 1: Create meeting service**

```typescript
// apps/web/src/server/services/meeting.service.ts
import { err, ok, type Result } from "neverthrow";
import { logger } from "@/lib/logger";
import { ActionErrors, type ActionResult } from "@/lib/server-action-client/action-errors";
import { CacheInvalidation } from "@/lib/cache-utils";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { MeetingAgendaItemsQueries } from "@/server/data-access/meeting-agenda-items.queries";
import { type NewMeeting, type Meeting } from "@/server/db/schema/meetings";
import { type NewMeetingAgendaItem } from "@/server/db/schema/meeting-agenda-items";
import { NotificationService } from "./notification.service";

export class MeetingService {
  /**
   * Create a meeting and optionally populate agenda from calendar description
   */
  static async createMeeting(
    data: NewMeeting
  ): Promise<ActionResult<Meeting>> {
    try {
      const meeting = await MeetingsQueries.insert(data);

      CacheInvalidation.invalidateMeetings(data.organizationId);

      // Send prep notification
      await NotificationService.createNotification({
        userId: data.createdById,
        organizationId: data.organizationId,
        type: "meeting_prep_reminder",
        title: "New meeting detected",
        message: `${data.title} - Add an agenda to prepare.`,
        metadata: { meetingId: meeting.id },
      });

      logger.info("Meeting created", {
        component: "MeetingService",
        meetingId: meeting.id,
        organizationId: data.organizationId,
      });

      return ok(meeting);
    } catch (error) {
      logger.error("Failed to create meeting", {
        component: "MeetingService",
      }, error as Error);
      return err(ActionErrors.internal("Failed to create meeting", error));
    }
  }

  /**
   * Find or create a meeting for a calendar event (dedup by calendarEventId)
   */
  static async findOrCreateForCalendarEvent(
    calendarEventId: string,
    organizationId: string,
    meetingData: NewMeeting
  ): Promise<ActionResult<Meeting>> {
    try {
      const existing = await MeetingsQueries.findByCalendarEventId(
        calendarEventId,
        organizationId
      );

      if (existing) {
        return ok(existing);
      }

      return this.createMeeting(meetingData);
    } catch (error) {
      logger.error("Failed to find or create meeting", {
        component: "MeetingService",
        calendarEventId,
      }, error as Error);
      return err(ActionErrors.internal("Failed to find or create meeting", error));
    }
  }

  /**
   * Transition meeting status based on bot events
   */
  static async updateStatus(
    meetingId: string,
    organizationId: string,
    status: Meeting["status"],
    additionalData?: Partial<Meeting>
  ): Promise<ActionResult<Meeting>> {
    try {
      const meeting = await MeetingsQueries.update(meetingId, organizationId, {
        status,
        ...additionalData,
      });

      if (!meeting) {
        return err(ActionErrors.notFound("Meeting not found"));
      }

      CacheInvalidation.invalidateMeeting(meetingId);
      CacheInvalidation.invalidateMeetings(organizationId);

      return ok(meeting);
    } catch (error) {
      logger.error("Failed to update meeting status", {
        component: "MeetingService",
        meetingId,
        status,
      }, error as Error);
      return err(ActionErrors.internal("Failed to update meeting status", error));
    }
  }
}
```

> **Note:** The `"meeting_prep_reminder"` notification type needs to be added to the `notificationTypeEnum` in the notifications schema. Add it when implementing this task.

**Step 2: Commit**
```bash
git add apps/web/src/server/services/meeting.service.ts
git commit -m "feat: add MeetingService for core meeting CRUD"
```

---

## Task 11: AgendaTrackerService — AI-powered agenda checking

**Files:**
- Create: `apps/web/src/server/services/agenda-tracker.service.ts`

**Step 1: Create the service**

```typescript
// apps/web/src/server/services/agenda-tracker.service.ts
import { err, ok } from "neverthrow";
import { logger } from "@/lib/logger";
import { ActionErrors, type ActionResult } from "@/lib/server-action-client/action-errors";
import { RecallApiService } from "./recall-api.service";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { MeetingAgendaItemsQueries } from "@/server/data-access/meeting-agenda-items.queries";
import { type MeetingAgendaItem } from "@/server/db/schema/meeting-agenda-items";
import { type Meeting } from "@/server/db/schema/meetings";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const agendaCheckResultSchema = z.object({
  items: z.array(
    z.object({
      agendaItemId: z.string(),
      covered: z.boolean(),
      summary: z.string(),
      keyPoints: z.array(z.string()),
    })
  ),
});

export class AgendaTrackerService {
  /**
   * Check a single meeting's agenda against its live transcript
   */
  static async checkMeetingAgenda(
    meeting: Meeting,
    recallBotId: string
  ): Promise<ActionResult<{ newlyCovered: number }>> {
    try {
      // 1. Fetch transcript from Recall.ai
      const transcriptResult = await RecallApiService.getTranscript(recallBotId);
      if (transcriptResult.isErr()) {
        return err(transcriptResult.error);
      }

      // 2. Flatten transcript to plain text
      const transcriptText = transcriptResult.value.transcript
        .map((segment) => {
          const words = segment.words.map((w) => w.text).join(" ");
          return `${segment.speaker}: ${words}`;
        })
        .join("\n");

      // 3. Skip if transcript hasn't grown since last check
      if (transcriptText.length <= meeting.lastTranscriptLength) {
        return ok({ newlyCovered: 0 });
      }

      // 4. Skip if too short since last check
      const newContent = transcriptText.slice(meeting.lastTranscriptLength);
      const wordCount = newContent.split(/\s+/).length;
      if (wordCount < 100) {
        return ok({ newlyCovered: 0 });
      }

      // 5. Get unchecked agenda items
      const uncheckedItems = await MeetingAgendaItemsQueries.findUncheckedByMeetingId(meeting.id);
      if (uncheckedItems.length === 0) {
        return ok({ newlyCovered: 0 });
      }

      // 6. LLM analysis
      const allItems = await MeetingAgendaItemsQueries.findByMeetingId(meeting.id);
      const result = await this.analyzeTranscript(transcriptText, uncheckedItems);

      if (result.isErr()) {
        return err(result.error);
      }

      // 7. Update covered items
      const coveredItems: MeetingAgendaItem[] = [];
      for (const itemResult of result.value.items) {
        if (!itemResult.covered) continue;

        const updated = await MeetingAgendaItemsQueries.update(
          itemResult.agendaItemId,
          meeting.id,
          {
            status: "covered",
            coveredAt: new Date(),
            aiSummary: itemResult.summary,
            aiKeyPoints: itemResult.keyPoints,
          }
        );
        if (updated) coveredItems.push(updated);
      }

      // 8. Send chat message if items were newly covered
      if (coveredItems.length > 0) {
        const message = this.composeChatMessage(allItems, coveredItems);
        const sendResult = await RecallApiService.sendChatMessage(recallBotId, message);
        if (sendResult.isErr()) {
          logger.warn("Failed to send agenda update chat message", {
            component: "AgendaTrackerService",
            meetingId: meeting.id,
            error: sendResult.error.message,
          });
        }
      }

      // 9. Update meeting tracking fields
      await MeetingsQueries.update(meeting.id, meeting.organizationId, {
        lastAgendaCheckAt: new Date(),
        lastTranscriptLength: transcriptText.length,
      });

      return ok({ newlyCovered: coveredItems.length });
    } catch (error) {
      logger.error("Failed to check meeting agenda", {
        component: "AgendaTrackerService",
        meetingId: meeting.id,
      }, error as Error);
      return err(ActionErrors.internal("Failed to check meeting agenda", error));
    }
  }

  private static async analyzeTranscript(
    transcript: string,
    uncheckedItems: MeetingAgendaItem[]
  ): Promise<ActionResult<z.infer<typeof agendaCheckResultSchema>>> {
    try {
      const itemsList = uncheckedItems
        .map((item, i) => `${i + 1}. [ID: ${item.id}] ${item.title}${item.description ? ` - ${item.description}` : ""}`)
        .join("\n");

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: agendaCheckResultSchema,
        prompt: `You are analyzing a live meeting transcript to determine which agenda items have been discussed and covered.

Agenda items to check:
${itemsList}

Transcript:
${transcript}

For each agenda item, determine:
- covered: has this topic been substantively discussed (not just a passing mention)?
- summary: 1-2 sentence summary of what was discussed (empty string if not covered)
- keyPoints: bullet points of key decisions/takeaways (empty array if not covered)

Use the exact agendaItemId from the list above. Only mark items as covered if there was meaningful discussion.`,
      });

      return ok(object);
    } catch (error) {
      logger.error("Failed to analyze transcript with LLM", {
        component: "AgendaTrackerService",
      }, error as Error);
      return err(ActionErrors.internal("Failed to analyze transcript", error));
    }
  }

  private static composeChatMessage(
    allItems: MeetingAgendaItem[],
    newlyCoveredItems: MeetingAgendaItem[]
  ): string {
    const coveredCount = allItems.filter(
      (item) => item.status === "covered" || newlyCoveredItems.some((c) => c.id === item.id)
    ).length;
    const totalCount = allItems.length;

    let message = `Meeting Progress: ${coveredCount}/${totalCount} agenda items covered\n\n`;

    for (const item of newlyCoveredItems) {
      message += `${item.title}`;
      if (item.aiKeyPoints && item.aiKeyPoints.length > 0) {
        message += ` -- Key points: ${item.aiKeyPoints.join(". ")}.`;
      }
      message += "\n\n";
    }

    const remaining = allItems.filter(
      (item) =>
        item.status !== "covered" &&
        item.status !== "skipped" &&
        !newlyCoveredItems.some((c) => c.id === item.id)
    );

    if (remaining.length > 0) {
      message += `Remaining: ${remaining.map((item) => item.title).join(", ")}`;
    }

    return message.trim();
  }
}
```

**Step 2: Commit**
```bash
git add apps/web/src/server/services/agenda-tracker.service.ts
git commit -m "feat: add AgendaTrackerService for AI-powered agenda checking"
```

---

## Task 12: Agenda check cron endpoint

**Files:**
- Create: `apps/web/src/app/api/cron/agenda-check/route.ts`

**Step 1: Create the cron route**

```typescript
// apps/web/src/app/api/cron/agenda-check/route.ts
import { logger } from "@/lib/logger";
import { AgendaTrackerService } from "@/server/services/agenda-tracker.service";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "AgendaCheckCron",
      });
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        component: "AgendaCheckCron",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Find all in-progress meetings
    const activeMeetings = await MeetingsQueries.findActiveMeetingsWithAgenda();

    if (activeMeetings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active meetings to check",
        durationMs: Date.now() - startTime,
      });
    }

    // 3. Process each meeting
    const results: Array<{ meetingId: string; newlyCovered: number; error?: string }> = [];

    for (const meeting of activeMeetings) {
      // Find the active bot session for this meeting
      // Need to query bot_sessions by meetingId and status active
      const botSessions = await BotSessionsQueries.findByMeetingId(meeting.id);
      const activeSession = botSessions.find((s) => s.botStatus === "active");

      if (!activeSession?.recallBotId) {
        continue;
      }

      const result = await AgendaTrackerService.checkMeetingAgenda(
        meeting,
        activeSession.recallBotId
      );

      if (result.isOk()) {
        results.push({ meetingId: meeting.id, newlyCovered: result.value.newlyCovered });
      } else {
        results.push({ meetingId: meeting.id, newlyCovered: 0, error: result.error.message });
      }
    }

    const duration = Date.now() - startTime;
    logger.info("Agenda check cron completed", {
      component: "AgendaCheckCron",
      meetingsChecked: activeMeetings.length,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      results,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Error in agenda check cron", {
      component: "AgendaCheckCron",
      durationMs: duration,
    }, error as Error);
    return NextResponse.json(
      { success: false, error: "Internal server error", durationMs: duration },
      { status: 500 }
    );
  }
}
```

> **Note:** `BotSessionsQueries.findByMeetingId` needs to be added to `bot-sessions.queries.ts`. Add a method that queries by the new `meetingId` column.

**Step 2: Add cron schedule to vercel.json**

Check `vercel.json` for existing crons and add:
```json
{
  "path": "/api/cron/agenda-check",
  "schedule": "*/5 * * * *"
}
```

**Step 3: Commit**
```bash
git add apps/web/src/app/api/cron/agenda-check/route.ts vercel.json
git commit -m "feat: add agenda-check cron endpoint (every 5 min)"
```

---

## Task 13: PostActionExecutorService

**Files:**
- Create: `apps/web/src/server/services/post-action-executor.service.ts`

**Step 1: Create the service**

```typescript
// apps/web/src/server/services/post-action-executor.service.ts
import { err, ok } from "neverthrow";
import { logger } from "@/lib/logger";
import { ActionErrors, type ActionResult } from "@/lib/server-action-client/action-errors";
import { MeetingPostActionsQueries } from "@/server/data-access/meeting-post-actions.queries";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { type MeetingPostAction, type PostActionType } from "@/server/db/schema/meeting-post-actions";
import { type Meeting } from "@/server/db/schema/meetings";

const MAX_RETRIES = 3;

export class PostActionExecutorService {
  /**
   * Execute all pending post-actions for a meeting
   */
  static async executePostActions(
    meetingId: string,
    organizationId: string
  ): Promise<ActionResult<{ executed: number; failed: number }>> {
    try {
      const meeting = await MeetingsQueries.findById(meetingId, organizationId);
      if (!meeting) {
        return err(ActionErrors.notFound("Meeting not found"));
      }

      const pendingActions = await MeetingPostActionsQueries.findPendingByMeetingId(meetingId);
      let executed = 0;
      let failed = 0;

      for (const action of pendingActions) {
        const result = await this.executeAction(action, meeting);
        if (result.isOk()) {
          executed++;
        } else {
          failed++;
        }
      }

      logger.info("Post-actions execution completed", {
        component: "PostActionExecutorService",
        meetingId,
        executed,
        failed,
      });

      return ok({ executed, failed });
    } catch (error) {
      logger.error("Failed to execute post-actions", {
        component: "PostActionExecutorService",
        meetingId,
      }, error as Error);
      return err(ActionErrors.internal("Failed to execute post-actions", error));
    }
  }

  private static async executeAction(
    action: MeetingPostAction,
    meeting: Meeting
  ): Promise<ActionResult<void>> {
    await MeetingPostActionsQueries.update(action.id, { status: "running" });

    try {
      switch (action.type) {
        case "send_summary_email":
          await this.executeSendSummaryEmail(meeting, action);
          break;
        case "create_tasks":
          await this.executeCreateTasks(meeting, action);
          break;
        case "share_recording":
          await this.executeShareRecording(meeting, action);
          break;
        case "generate_followup_agenda":
          await this.executeGenerateFollowup(meeting, action);
          break;
        case "push_external":
          await this.executePushExternal(meeting, action);
          break;
      }

      await MeetingPostActionsQueries.update(action.id, {
        status: "completed",
        executedAt: new Date(),
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Post-action execution failed", {
        component: "PostActionExecutorService",
        actionId: action.id,
        actionType: action.type,
      }, error as Error);

      await MeetingPostActionsQueries.update(action.id, {
        status: "failed",
        result: { error: error instanceof Error ? error.message : String(error) },
      });

      return err(ActionErrors.internal(`Post-action ${action.type} failed`, error));
    }
  }

  // --- Individual action implementations (stubs to be fleshed out) ---

  private static async executeSendSummaryEmail(
    meeting: Meeting,
    action: MeetingPostAction
  ): Promise<void> {
    // TODO: Implement in Task 14
    // 1. Get recording + AI summary for this meeting
    // 2. Generate share token
    // 3. Build email with summary, key decisions, action items, secure link
    // 4. Send via Resend to participants who are org members
    logger.info("Send summary email - not yet implemented", {
      component: "PostActionExecutorService",
      meetingId: meeting.id,
    });
  }

  private static async executeCreateTasks(
    meeting: Meeting,
    action: MeetingPostAction
  ): Promise<void> {
    // TODO: Implement in Task 15
    // 1. Get AI-extracted tasks from recording workflow
    // 2. Fuzzy match assignees to participants
    // 3. Create tasks linked to meeting's project
    logger.info("Create tasks - not yet implemented", {
      component: "PostActionExecutorService",
      meetingId: meeting.id,
    });
  }

  private static async executeShareRecording(
    meeting: Meeting,
    action: MeetingPostAction
  ): Promise<void> {
    // TODO: Implement in Task 16
    // 1. Generate meeting_share_token (requiresAuth, requiresOrgMembership, 30 day expiry)
    // 2. Send notification/email with secure link
    logger.info("Share recording - not yet implemented", {
      component: "PostActionExecutorService",
      meetingId: meeting.id,
    });
  }

  private static async executeGenerateFollowup(
    meeting: Meeting,
    action: MeetingPostAction
  ): Promise<void> {
    // TODO: Implement in Task 17
    // 1. Get transcript + uncovered agenda items + action items
    // 2. LLM generates follow-up agenda
    // 3. Create new meeting in draft status with pre-populated agenda
    // 4. Send notification
    logger.info("Generate followup - not yet implemented", {
      component: "PostActionExecutorService",
      meetingId: meeting.id,
    });
  }

  private static async executePushExternal(
    meeting: Meeting,
    action: MeetingPostAction
  ): Promise<void> {
    // TODO: Implement in Task 18
    // 1. Read config for provider (slack / google_docs)
    // 2. Call provider-specific API
    logger.info("Push external - not yet implemented", {
      component: "PostActionExecutorService",
      meetingId: meeting.id,
    });
  }
}
```

**Step 2: Commit**
```bash
git add apps/web/src/server/services/post-action-executor.service.ts
git commit -m "feat: add PostActionExecutorService with action stubs"
```

---

## Task 14: Hook into bot-webhook.service.ts — meeting lifecycle

**Files:**
- Modify: `apps/web/src/server/services/bot-webhook.service.ts`

**Step 1: Import MeetingService**

Add at top of file:
```typescript
import { MeetingService } from "./meeting.service";
import { PostActionExecutorService } from "./post-action-executor.service";
```

**Step 2: Hook into processStatusChange**

In the `processStatusChange` method, after the status update logic:

When `internalStatus === "active"` and session has a `meetingId`:
```typescript
if (internalStatus === "active" && existingSession.meetingId) {
  await MeetingService.updateStatus(
    existingSession.meetingId,
    organizationId,
    "in_progress",
    { actualStartAt: new Date() }
  );
}
```

When `internalStatus === "completed"` and session has a `meetingId`:
```typescript
if ((internalStatus === "completed" || internalStatus === "leaving") && existingSession.meetingId) {
  await MeetingService.updateStatus(
    existingSession.meetingId,
    organizationId,
    "completed",
    { actualEndAt: new Date() }
  );
}
```

**Step 3: Hook into recording done handler**

After `convertRecordingIntoAiInsights` completes successfully, trigger post-actions:
```typescript
if (existingSession.meetingId) {
  // Allow AI workflow to complete first, then run post-actions
  // This is fire-and-forget — errors are logged internally
  PostActionExecutorService.executePostActions(
    existingSession.meetingId,
    organizationId
  ).catch((error) => {
    logger.error("Failed to trigger post-actions", {
      component: "BotWebhookService",
      meetingId: existingSession.meetingId,
    }, error as Error);
  });
}
```

**Step 4: Commit**
```bash
git add apps/web/src/server/services/bot-webhook.service.ts
git commit -m "feat: hook meeting lifecycle into bot webhook service"
```

---

## Task 15: Hook into bot-calendar-monitor — auto-create meetings

**Files:**
- Modify: `apps/web/src/server/services/bot-calendar-monitor.service.ts`

**Step 1: Import MeetingService**

```typescript
import { MeetingService } from "./meeting.service";
```

**Step 2: After bot session creation, create/link meeting**

Find where `BotSessionsQueries.insert()` is called (or where the bot session is created). After successful creation:

```typescript
// Create or find meeting for this calendar event
const meetingResult = await MeetingService.findOrCreateForCalendarEvent(
  calendarEventId,
  organizationId,
  {
    organizationId,
    projectId: selectedProjectId,
    createdById: userId,
    calendarEventId,
    externalCalendarId: event.id, // Google Calendar event ID
    title: event.summary || "Untitled Meeting",
    description: event.description || null,
    scheduledStartAt: new Date(event.start.dateTime),
    scheduledEndAt: event.end?.dateTime ? new Date(event.end.dateTime) : undefined,
    status: "scheduled",
    meetingUrl: meetingUrl,
    participants: (event.attendees || []).map((a: { email: string; displayName?: string }) => ({
      email: a.email,
      name: a.displayName || null,
      role: null,
    })),
  }
);

if (meetingResult.isOk()) {
  // Link bot session to meeting
  await BotSessionsQueries.update(session.id, organizationId, {
    meetingId: meetingResult.value.id,
  });
}
```

> **Note:** The exact code depends on the current structure of the calendar monitor. Read the file carefully and adapt the field names to match the actual calendar event shape.

**Step 3: Commit**
```bash
git add apps/web/src/server/services/bot-calendar-monitor.service.ts
git commit -m "feat: auto-create meetings from calendar monitor"
```

---

## Task 16: Hook into add-bot-to-meeting action — create/link meeting

**Files:**
- Modify: `apps/web/src/features/meetings/actions/add-bot-to-meeting.ts`

**Step 1: Import MeetingService**

```typescript
import { MeetingService } from "@/server/services/meeting.service";
```

**Step 2: After bot session creation, create meeting**

After the bot session is successfully created:

```typescript
const meetingResult = await MeetingService.findOrCreateForCalendarEvent(
  calendarEventId,
  organizationId,
  {
    organizationId,
    projectId: projectId || null,
    createdById: user.id,
    calendarEventId,
    title: meetingTitle || "Untitled Meeting",
    scheduledStartAt: new Date(),
    status: "scheduled",
    meetingUrl,
  }
);

if (meetingResult.isOk()) {
  // Link the bot session to the meeting
  await BotSessionsQueries.updateByRecallBotId(
    sessionResult.value.botId,
    organizationId,
    { meetingId: meetingResult.value.id }
  );
}
```

> **Note:** Adapt field names to match current action structure. The `meetingTitle` may come from different sources.

**Step 3: Commit**
```bash
git add apps/web/src/features/meetings/actions/add-bot-to-meeting.ts
git commit -m "feat: create meeting when adding bot to meeting"
```

---

## Task 17: Notification types — add meeting notifications

**Files:**
- Modify: `apps/web/src/server/db/schema/notifications.ts`

**Step 1: Add new notification types**

Add to the `notificationTypeEnum` array:
```typescript
"meeting_prep_reminder",
"meeting_followup_ready",
"meeting_post_action_complete",
```

**Step 2: Commit**
```bash
git add apps/web/src/server/db/schema/notifications.ts
git commit -m "feat: add meeting notification types"
```

---

## Task 18: Server Actions — agenda CRUD

**Files:**
- Create: `apps/web/src/features/meetings/actions/agenda-actions.ts`

**Step 1: Create agenda server actions**

```typescript
// apps/web/src/features/meetings/actions/agenda-actions.ts
"use server";

import { z } from "zod";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { MeetingAgendaItemsQueries } from "@/server/data-access/meeting-agenda-items.queries";
import { MeetingAgendaTemplatesQueries } from "@/server/data-access/meeting-agenda-templates.queries";
import { CacheInvalidation } from "@/lib/cache-utils";

const addAgendaItemSchema = z.object({
  meetingId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0),
});

export const addAgendaItem = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create"), name: "add-agenda-item" })
  .schema(addAgendaItemSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const item = await MeetingAgendaItemsQueries.insert(parsedInput);
    CacheInvalidation.invalidateMeetingAgendaItems(parsedInput.meetingId);
    return { success: true, item };
  });

const updateAgendaItemSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: z.enum(["pending", "in_progress", "covered", "skipped"]).optional(),
});

export const updateAgendaItem = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create"), name: "update-agenda-item" })
  .schema(updateAgendaItemSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const { id, meetingId, ...data } = parsedInput;
    const item = await MeetingAgendaItemsQueries.update(id, meetingId, data);
    if (!item) throw ActionErrors.notFound("Agenda item not found");
    CacheInvalidation.invalidateMeetingAgendaItems(meetingId);
    return { success: true, item };
  });

const deleteAgendaItemSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
});

export const deleteAgendaItem = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create"), name: "delete-agenda-item" })
  .schema(deleteAgendaItemSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const deleted = await MeetingAgendaItemsQueries.delete(parsedInput.id, parsedInput.meetingId);
    if (!deleted) throw ActionErrors.notFound("Agenda item not found");
    CacheInvalidation.invalidateMeetingAgendaItems(parsedInput.meetingId);
    return { success: true };
  });

const applyTemplateSchema = z.object({
  meetingId: z.string().uuid(),
  templateId: z.string().uuid(),
  replaceExisting: z.boolean().default(false),
});

export const applyAgendaTemplate = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create"), name: "apply-agenda-template" })
  .schema(applyTemplateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const template = await MeetingAgendaTemplatesQueries.findById(parsedInput.templateId);
    if (!template) throw ActionErrors.notFound("Template not found");

    if (parsedInput.replaceExisting) {
      await MeetingAgendaItemsQueries.deleteByMeetingId(parsedInput.meetingId);
    }

    const items = await MeetingAgendaItemsQueries.insertMany(
      template.items.map((item) => ({
        meetingId: parsedInput.meetingId,
        title: item.title,
        description: item.description,
        sortOrder: item.sortOrder,
      }))
    );

    CacheInvalidation.invalidateMeetingAgendaItems(parsedInput.meetingId);
    return { success: true, items };
  });
```

**Step 2: Commit**
```bash
git add apps/web/src/features/meetings/actions/agenda-actions.ts
git commit -m "feat: add agenda CRUD server actions"
```

---

## Task 19: Server Actions — meeting CRUD and post-action config

**Files:**
- Create: `apps/web/src/features/meetings/actions/meeting-actions.ts`

**Step 1: Create meeting server actions**

```typescript
// apps/web/src/features/meetings/actions/meeting-actions.ts
"use server";

import { z } from "zod";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { MeetingPostActionsQueries } from "@/server/data-access/meeting-post-actions.queries";
import { MeetingNotesQueries } from "@/server/data-access/meeting-notes.queries";
import { CacheInvalidation } from "@/lib/cache-utils";

const updateMeetingSchema = z.object({
  meetingId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export const updateMeeting = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create"), name: "update-meeting" })
  .schema(updateMeetingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const { meetingId, ...data } = parsedInput;
    const meeting = await MeetingsQueries.update(meetingId, organizationId, data);
    if (!meeting) throw ActionErrors.notFound("Meeting not found");

    CacheInvalidation.invalidateMeeting(meetingId);
    CacheInvalidation.invalidateMeetings(organizationId);
    return { success: true, meeting };
  });

const saveNotesSchema = z.object({
  meetingId: z.string().uuid(),
  content: z.string(),
  type: z.enum(["pre_meeting", "during_meeting", "post_meeting"]),
});

export const saveMeetingNotes = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create"), name: "save-meeting-notes" })
  .schema(saveNotesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const note = await MeetingNotesQueries.upsert({
      ...parsedInput,
      createdById: user.id,
    });

    CacheInvalidation.invalidateMeetingNotes(parsedInput.meetingId);
    return { success: true, note };
  });

const configurePostActionsSchema = z.object({
  meetingId: z.string().uuid(),
  actions: z.array(
    z.object({
      type: z.enum([
        "send_summary_email",
        "create_tasks",
        "share_recording",
        "generate_followup_agenda",
        "push_external",
      ]),
      enabled: z.boolean(),
      config: z.record(z.unknown()).optional(),
    })
  ),
});

export const configurePostActions = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create"), name: "configure-post-actions" })
  .schema(configurePostActionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    // Replace all post actions for this meeting
    const existing = await MeetingPostActionsQueries.findByMeetingId(parsedInput.meetingId);
    // Only replace pending ones (don't touch completed/running)
    for (const action of existing.filter((a) => a.status === "pending")) {
      await MeetingPostActionsQueries.update(action.id, { status: "skipped" });
    }

    const enabledActions = parsedInput.actions.filter((a) => a.enabled);
    const created = await MeetingPostActionsQueries.insertMany(
      enabledActions.map((a) => ({
        meetingId: parsedInput.meetingId,
        type: a.type,
        config: a.config || {},
      }))
    );

    return { success: true, actions: created };
  });
```

**Step 2: Commit**
```bash
git add apps/web/src/features/meetings/actions/meeting-actions.ts
git commit -m "feat: add meeting CRUD and post-action config server actions"
```

---

## Task 20: Server Action — AI-assisted agenda generation

**Files:**
- Create: `apps/web/src/features/meetings/actions/generate-agenda.ts`

**Step 1: Create AI agenda generation action**

```typescript
// apps/web/src/features/meetings/actions/generate-agenda.ts
"use server";

import { z } from "zod";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { MeetingAgendaItemsQueries } from "@/server/data-access/meeting-agenda-items.queries";
import { CacheInvalidation } from "@/lib/cache-utils";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";

const generateAgendaSchema = z.object({
  meetingId: z.string().uuid(),
  prompt: z.string().min(10, "Please provide a description of at least 10 characters"),
});

const aiAgendaResultSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
});

export const generateAgendaFromAI = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create"), name: "generate-agenda-from-ai" })
  .schema(generateAgendaSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: aiAgendaResultSchema,
      prompt: `Generate a structured meeting agenda based on this description:

"${parsedInput.prompt}"

Create 3-7 focused agenda items. Each item should have:
- title: short, actionable title (e.g., "Review Q1 metrics", "Discuss hiring plan")
- description: 1-2 sentence description of what to cover

Keep items focused and time-appropriate for a typical meeting.`,
    });

    const items = await MeetingAgendaItemsQueries.insertMany(
      object.items.map((item, index) => ({
        meetingId: parsedInput.meetingId,
        title: item.title,
        description: item.description,
        sortOrder: index,
      }))
    );

    CacheInvalidation.invalidateMeetingAgendaItems(parsedInput.meetingId);
    return { success: true, items };
  });
```

**Step 2: Commit**
```bash
git add apps/web/src/features/meetings/actions/generate-agenda.ts
git commit -m "feat: add AI-assisted agenda generation server action"
```

---

## Task 21: Meeting prep page — server component and layout

**Files:**
- Create: `apps/web/src/app/(main)/meetings/[meetingId]/prep/page.tsx`

**Step 1: Create the page**

```typescript
// apps/web/src/app/(main)/meetings/[meetingId]/prep/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { MeetingAgendaItemsQueries } from "@/server/data-access/meeting-agenda-items.queries";
import { MeetingNotesQueries } from "@/server/data-access/meeting-notes.queries";
import { MeetingPostActionsQueries } from "@/server/data-access/meeting-post-actions.queries";
import { MeetingAgendaTemplatesQueries } from "@/server/data-access/meeting-agenda-templates.queries";
import { MeetingPrepContent } from "@/features/meetings/components/meeting-prep-content";

interface PageProps {
  params: Promise<{ meetingId: string }>;
}

async function MeetingPrepLoader({ meetingId }: { meetingId: string }) {
  const authResult = await getBetterAuthSession();
  if (authResult.isErr()) return notFound();

  const { user, organization } = authResult.value;
  const meeting = await MeetingsQueries.findById(meetingId, organization.id);
  if (!meeting) return notFound();

  const [agendaItems, notes, postActions, templates] = await Promise.all([
    MeetingAgendaItemsQueries.findByMeetingId(meetingId),
    MeetingNotesQueries.findByMeetingId(meetingId),
    MeetingPostActionsQueries.findByMeetingId(meetingId),
    MeetingAgendaTemplatesQueries.findAvailable(organization.id),
  ]);

  const preNotes = notes.find((n) => n.type === "pre_meeting");

  return (
    <MeetingPrepContent
      meeting={meeting}
      agendaItems={agendaItems}
      preNotes={preNotes ?? null}
      postActions={postActions}
      templates={templates}
    />
  );
}

export default async function MeetingPrepPage(props: PageProps) {
  const params = await props.params;

  return (
    <div className="container max-w-4xl py-8">
      <Suspense fallback={<div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-64 bg-muted rounded" />
      </div>}>
        <MeetingPrepLoader meetingId={params.meetingId} />
      </Suspense>
    </div>
  );
}
```

> **Note:** The `MeetingPrepContent` client component (Task 22) handles all interactivity: agenda builder, notes editor, post-action toggles, template selection, AI generation.

**Step 2: Commit**
```bash
git add apps/web/src/app/(main)/meetings/[meetingId]/prep/page.tsx
git commit -m "feat: add meeting prep page (server component)"
```

---

## Task 22: Meeting prep page — client components

**Files:**
- Create: `apps/web/src/features/meetings/components/meeting-prep-content.tsx`
- Create: `apps/web/src/features/meetings/components/agenda-builder.tsx`
- Create: `apps/web/src/features/meetings/components/post-action-config.tsx`
- Create: `apps/web/src/features/meetings/hooks/use-agenda-actions.ts`
- Create: `apps/web/src/features/meetings/hooks/use-meeting-actions.ts`

This is the largest UI task. The components should use:
- Shadcn UI: `Card`, `Button`, `Input`, `Textarea`, `Switch`, `Select`, `Badge`
- `@dnd-kit/sortable` for drag-and-drop agenda reordering (check if already a dependency, install if not)
- `useAction` from `next-safe-action` for mutation hooks
- `sonner` for toast notifications

**Step 1: Create `use-agenda-actions.ts` hook**

Wrap the agenda server actions with `useAction` from next-safe-action. Include `addAgendaItem`, `updateAgendaItem`, `deleteAgendaItem`, `applyAgendaTemplate`, `generateAgendaFromAI` — each with success/error toast handlers.

**Step 2: Create `use-meeting-actions.ts` hook**

Wrap `updateMeeting`, `saveMeetingNotes`, `configurePostActions` with `useAction`.

**Step 3: Create `agenda-builder.tsx`**

Client component (`"use client"`) with:
- Sortable list of agenda items (drag handle, title, description, status badge, delete button)
- Inline "Add item" form at the bottom
- Template selector dropdown
- "Generate with AI" button that opens a prompt input
- Uses the `use-agenda-actions` hook

**Step 4: Create `post-action-config.tsx`**

Client component with toggle switches for each of the 5 post-meeting action types. Each toggle represents enabling/disabling that action. Some actions have additional config (e.g., push_external needs provider selection).

**Step 5: Create `meeting-prep-content.tsx`**

Parent client component that composes:
- Meeting header (title, time, participants)
- `AgendaBuilder`
- Pre-meeting notes `Textarea`
- `PostActionConfig`

**Step 6: Commit**
```bash
git add apps/web/src/features/meetings/components/ apps/web/src/features/meetings/hooks/
git commit -m "feat: add meeting prep client components and hooks"
```

---

## Task 23: Meeting detail page (post-meeting view)

**Files:**
- Create: `apps/web/src/app/(main)/meetings/[meetingId]/page.tsx`
- Create: `apps/web/src/features/meetings/components/meeting-detail-content.tsx`

**Step 1: Create the server page**

Similar pattern to prep page — fetch meeting, agenda items (with coverage status), recording, transcript, summary, post-action results. Pass to a `MeetingDetailContent` client component.

**Step 2: Create `meeting-detail-content.tsx`**

Displays:
- Meeting summary header
- Agenda items with coverage status (covered items show AI summary + key points)
- Recording player (if available)
- Transcript (collapsible)
- Post-action results (status of each executed action)
- Follow-up meeting link (if generated)

**Step 3: Commit**
```bash
git add apps/web/src/app/(main)/meetings/[meetingId]/page.tsx apps/web/src/features/meetings/components/meeting-detail-content.tsx
git commit -m "feat: add meeting detail page (post-meeting view)"
```

---

## Task 24: BotSessionsQueries — add findByMeetingId

**Files:**
- Modify: `apps/web/src/server/data-access/bot-sessions.queries.ts`

**Step 1: Add findByMeetingId method**

```typescript
static async findByMeetingId(meetingId: string): Promise<BotSession[]> {
  return db
    .select()
    .from(botSessions)
    .where(eq(botSessions.meetingId, meetingId));
}
```

**Step 2: Commit**
```bash
git add apps/web/src/server/data-access/bot-sessions.queries.ts
git commit -m "feat: add findByMeetingId to BotSessionsQueries"
```

---

## Task 25: Update notification types and add ActionErrors.notFound

**Files:**
- Check if `ActionErrors.notFound` exists in `apps/web/src/lib/server-action-client/action-errors.ts`. If not, add it:

```typescript
notFound: (message = "Resource not found", context?: string) =>
  createActionError("NOT_FOUND", message, { context }),
```

**Step 1: Verify and add if missing**

**Step 2: Commit**
```bash
git add apps/web/src/lib/server-action-client/action-errors.ts
git commit -m "fix: ensure ActionErrors.notFound exists"
```

---

## Task 26: Typecheck and lint

**Step 1: Run typecheck**
```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm typecheck
```

Fix any type errors.

**Step 2: Run lint**
```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm lint
```

Fix any new lint warnings/errors introduced.

**Step 3: Commit fixes if any**
```bash
git add -A && git commit -m "fix: resolve typecheck and lint errors"
```

---

## Task 27: Build verification

**Step 1: Run build**
```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm build
```

Fix any build errors.

**Step 2: Commit fixes if any**

---

## Summary of task order and dependencies

```
Tasks 1-5:  Schema + migration (sequential, each builds on previous)
Tasks 6-7:  Data access layer (parallel, no deps between them)
Task 8:     Cache tags (depends on schema types from 1-3)
Task 9:     Recall API methods (independent)
Task 10:    MeetingService (depends on 6, 8)
Task 11:    AgendaTrackerService (depends on 7, 9, 10)
Task 12:    Agenda check cron (depends on 11)
Task 13:    PostActionExecutorService (depends on 7, 10)
Task 14:    Webhook hooks (depends on 10, 13)
Task 15:    Calendar monitor hooks (depends on 10)
Task 16:    Add-bot-to-meeting hooks (depends on 10)
Task 17:    Notification types (independent)
Task 18:    Agenda server actions (depends on 7)
Task 19:    Meeting server actions (depends on 6, 7)
Task 20:    AI agenda generation (depends on 7)
Task 21:    Prep page server component (depends on 6, 7)
Task 22:    Prep page client components (depends on 18, 19, 20, 21)
Task 23:    Detail page (depends on 6, 7)
Task 24:    BotSessionsQueries update (depends on 4)
Task 25:    ActionErrors.notFound check (independent)
Task 26-27: Verification (last)
```

**Parallelizable groups:**
- Tasks 6+7+8+9+17+24+25 (all independent after schema)
- Tasks 10+18+19+20 (after data access)
- Tasks 11+13 (after services)
- Tasks 14+15+16 (after MeetingService)
- Tasks 21+23 (after server actions)
