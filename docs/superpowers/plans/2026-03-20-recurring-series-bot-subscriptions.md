# Recurring Series Bot Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace global autoJoinEnabled/requirePerMeetingConsent with per-series bot subscriptions so users can selectively record recurring meeting series.

**Architecture:** New `bot_series_subscriptions` table tracks which recurring series a user subscribes to. Calendar monitor and a daily backfill cron create bot sessions only for subscribed series. All consent flow and auto-join code is removed.

**Tech Stack:** Drizzle ORM, Next.js 16 App Router, next-safe-action, neverthrow, Google Calendar API, Microsoft Graph API, Recall.ai

**Spec:** `docs/superpowers/specs/2026-03-20-recurring-series-bot-subscriptions-design.md`

---

## File Structure

### New files

| File                                                          | Responsibility                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/server/db/schema/bot-series-subscriptions.ts`            | Drizzle schema for `bot_series_subscriptions` table              |
| `src/server/data-access/bot-series-subscriptions.queries.ts`  | Data access layer for subscriptions CRUD                         |
| `src/server/services/bot-backfill.service.ts`                 | Shared backfill logic (create bot sessions for series instances) |
| `src/features/bot/actions/subscribe-to-series.ts`             | Server action: subscribe to a recurring series                   |
| `src/features/bot/actions/unsubscribe-from-series.ts`         | Server action: unsubscribe and cancel pending sessions           |
| `src/features/bot/hooks/use-subscribe-to-series.ts`           | Client hook wrapping subscribe action                            |
| `src/features/bot/hooks/use-unsubscribe-from-series.ts`       | Client hook wrapping unsubscribe action                          |
| `src/features/bot/hooks/use-series-subscriptions.ts`          | Client hook to fetch user's subscriptions                        |
| `src/app/api/cron/backfill-series/route.ts`                   | Daily cron for rolling 30-day backfill                           |
| `src/server/validation/bot/subscribe-to-series.schema.ts`     | Zod schema for subscribe action                                  |
| `src/server/validation/bot/unsubscribe-from-series.schema.ts` | Zod schema for unsubscribe action                                |

### Files to delete

| File                                                               | Reason               |
| ------------------------------------------------------------------ | -------------------- |
| `src/features/bot/actions/approve-bot-join.ts`                     | Consent flow removed |
| `src/features/bot/actions/deny-bot-join.ts`                        | Consent flow removed |
| `src/features/bot/hooks/use-bot-consent-notification.ts`           | Consent flow removed |
| `src/server/validation/bot/approve-bot-join.schema.ts`             | Consent flow removed |
| `src/server/validation/bot/deny-bot-join.schema.ts`                | Consent flow removed |
| `src/features/bot/components/bot-consent-notification.tsx`         | Consent flow removed |
| `src/features/bot/components/bot-consent-notification-actions.tsx` | Consent flow removed |
| `src/features/bot/components/bot-consent-notification-content.tsx` | Consent flow removed |
| `src/features/bot/lib/bot-notification-metadata.ts`                | Consent flow removed |
| `src/features/meetings/components/add-bot-consent-dialog.tsx`      | Consent flow removed |

### Files to modify

| File                                                          | Change                                                                                         |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/server/db/schema/bot-settings.ts`                        | Remove `autoJoinEnabled`, `requirePerMeetingConsent` columns                                   |
| `src/server/db/schema/bot-sessions.ts`                        | Remove `pending_consent` from enum, add `subscriptionId` FK                                    |
| `src/server/db/schema/index.ts`                               | Add export for `bot-series-subscriptions`                                                      |
| `src/server/validation/bot/bot-settings.schema.ts`            | Remove `autoJoinEnabled`, `requirePerMeetingConsent` fields                                    |
| `src/server/data-access/bot-settings.queries.ts`              | Remove fields from upsert                                                                      |
| `src/server/cache/bot-settings.cache.ts`                      | Remove defaults for removed fields                                                             |
| `src/server/services/calendar/types.ts`                       | Add `recurringSeriesId` to `CalendarEvent`                                                     |
| `src/server/services/calendar/calendar-provider.ts`           | Add `getSeriesInstances()` to interface                                                        |
| `src/server/services/calendar/google-calendar.provider.ts`    | Map `recurringEventId`, implement `getSeriesInstances()`                                       |
| `src/server/services/calendar/microsoft-calendar.provider.ts` | Add `seriesMasterId` to GraphEvent, map it, implement `getSeriesInstances()`, update `$select` |
| `src/server/services/google-calendar.service.ts`              | Add `getSeriesInstances()` method, map `recurringEventId` in event results                     |
| `src/server/services/bot-calendar-monitor.service.ts`         | Rewrite to use subscriptions instead of global auto-join                                       |
| `src/server/services/bot-webhook.service.ts`                  | Remove `pending_consent` handling                                                              |
| `src/server/services/bot-providers/recall/status-mapper.ts`   | Remap `pending` → `scheduled`, remove `pending_consent`                                        |
| `src/features/bot/actions/update-bot-settings.ts`             | Remove `autoJoinEnabled`, `requirePerMeetingConsent`                                           |
| `src/features/bot/actions/cancel-bot-session.ts`              | Remove `pending_consent` from cancellable statuses                                             |
| `src/features/bot/components/bot-configuration-form.tsx`      | Remove auto-join and consent toggles                                                           |
| `src/features/bot/components/enable-bot-toggle.tsx`           | Remove `autoJoinEnabled` from handler                                                          |
| `src/features/bot/components/bot-status-badge.tsx`            | Remove `pending_consent` badge                                                                 |
| `src/features/bot/components/bot-session-card.tsx`            | Remove `pending_consent` handling                                                              |
| `src/features/meetings/actions/add-bot-to-meeting.ts`         | Remove consent flow                                                                            |
| `src/features/meetings/actions/remove-bot-from-meeting.ts`    | Remove `pending_consent` from statuses                                                         |
| `src/features/meetings/hooks/use-add-bot-to-meeting.ts`       | Remove `consentGiven`, `onConsentRequired`                                                     |
| `src/features/meetings/hooks/use-meeting-status-counts.ts`    | Remove `pending_consent` counter                                                               |
| `src/features/meetings/components/meetings-filter.tsx`        | Remove "Pending Consent" filter                                                                |
| `src/features/meetings/components/meeting-details-modal.tsx`  | Remove consent dialog                                                                          |
| `src/features/meetings/components/add-bot-button.tsx`         | Remove consent logic                                                                           |
| `src/features/meetings/lib/calendar-utils.ts`                 | Remove `pending_consent` from status types                                                     |
| `src/features/notifications/components/notification-item.tsx` | Remove `BotConsentNotification` rendering                                                      |
| `src/features/notifications/components/notification-icon.tsx` | Remove `bot_consent_request` case                                                              |
| `src/server/dto/notification.dto.ts`                          | Remove `bot_consent_request` comment                                                           |
| `src/features/notifications/types.ts`                         | Remove `bot_consent_request` comment                                                           |
| `src/app/(main)/bot/sessions/page.tsx`                        | Remove `pending_consent` filter                                                                |

---

## Task 1: Database Schema — New `bot_series_subscriptions` Table

**Files:**

- Create: `src/server/db/schema/bot-series-subscriptions.ts`
- Modify: `src/server/db/schema/index.ts:1-46`

- [ ] **Step 1: Create the schema file**

```typescript
// src/server/db/schema/bot-series-subscriptions.ts
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const botSeriesSubscriptions = pgTable(
  "bot_series_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    organizationId: text("organization_id").notNull(),
    recurringSeriesId: text("recurring_series_id").notNull(),
    calendarProvider: text("calendar_provider", {
      enum: ["google", "microsoft"],
    }).notNull(),
    calendarId: text("calendar_id").notNull(),
    seriesTitle: text("series_title"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userOrgSeriesUnique: unique("bot_series_sub_user_org_series_unique").on(
      table.userId,
      table.organizationId,
      table.recurringSeriesId,
    ),
    userOrgActiveIdx: index("bot_series_sub_user_org_active_idx").on(
      table.userId,
      table.organizationId,
      table.active,
    ),
    orgSeriesIdx: index("bot_series_sub_org_series_idx").on(
      table.organizationId,
      table.recurringSeriesId,
    ),
  }),
);

export type BotSeriesSubscription = typeof botSeriesSubscriptions.$inferSelect;
export type NewBotSeriesSubscription =
  typeof botSeriesSubscriptions.$inferInsert;
```

- [ ] **Step 2: Add export to schema index**

Add `export * from "./bot-series-subscriptions";` to `src/server/db/schema/index.ts` after line 8 (after `bot-settings`).

- [ ] **Step 3: Commit**

```bash
git add src/server/db/schema/bot-series-subscriptions.ts src/server/db/schema/index.ts
git commit -m "feat(schema): add bot_series_subscriptions table"
```

---

## Task 2: Database Schema — Modify `bot_settings` and `bot_sessions`

**Files:**

- Modify: `src/server/db/schema/bot-settings.ts:23-27`
- Modify: `src/server/db/schema/bot-sessions.ts:13-21,25-86`

- [ ] **Step 1: Remove `autoJoinEnabled` and `requirePerMeetingConsent` from `bot-settings.ts`**

Remove lines 24-27 (the `autoJoinEnabled` and `requirePerMeetingConsent` column definitions).

- [ ] **Step 2: Remove `pending_consent` from `botStatusEnum` in `bot-sessions.ts`**

Change the enum array from:

```typescript
export const botStatusEnum = [
  "scheduled",
  "joining",
  "active",
  "leaving",
  "completed",
  "failed",
  "pending_consent",
] as const;
```

to:

```typescript
export const botStatusEnum = [
  "scheduled",
  "joining",
  "active",
  "leaving",
  "completed",
  "failed",
] as const;
```

- [ ] **Step 3: Add `subscriptionId` FK to `bot_sessions` table**

Add after the `meetingId` column (around line 53):

```typescript
subscriptionId: uuid("subscription_id").references(
  () => botSeriesSubscriptions.id,
  { onDelete: "set null" },
),
```

Import `botSeriesSubscriptions` at the top of the file:

```typescript
import { botSeriesSubscriptions } from "./bot-series-subscriptions";
```

Add an index for `subscriptionId` in the table's index definitions:

```typescript
subscriptionIdIdx: index("bot_sessions_subscription_id_idx").on(
  table.subscriptionId,
),
```

- [ ] **Step 4: Generate the migration**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm db:generate --name add_bot_series_subscriptions
```

Review the generated migration file. It should:

1. Create `bot_series_subscriptions` table
2. Add `subscription_id` column to `bot_sessions`
3. Drop `auto_join_enabled` and `require_per_meeting_consent` from `bot_settings`

Manually add these statements to the migration SQL before the column drops:

```sql
UPDATE "bot_sessions" SET "bot_status" = 'failed' WHERE "bot_status" = 'pending_consent';
UPDATE "notifications" SET "type" = 'info' WHERE "type" = 'bot_consent_request';
```

- [ ] **Step 5: Commit**

```bash
git add src/server/db/schema/bot-settings.ts src/server/db/schema/bot-sessions.ts src/server/db/migrations/
git commit -m "feat(schema): modify bot_settings and bot_sessions for series subscriptions"
```

---

## Task 3: Code Removal — Delete Consent Files

**Files:**

- Delete: `src/features/bot/actions/approve-bot-join.ts`
- Delete: `src/features/bot/actions/deny-bot-join.ts`
- Delete: `src/features/bot/hooks/use-bot-consent-notification.ts`
- Delete: `src/server/validation/bot/approve-bot-join.schema.ts`
- Delete: `src/server/validation/bot/deny-bot-join.schema.ts`
- Delete: `src/features/bot/components/bot-consent-notification.tsx`
- Delete: `src/features/bot/components/bot-consent-notification-actions.tsx`
- Delete: `src/features/bot/components/bot-consent-notification-content.tsx`
- Delete: `src/features/bot/lib/bot-notification-metadata.ts`
- Delete: `src/features/meetings/components/add-bot-consent-dialog.tsx`

- [ ] **Step 1: Delete all consent-related files**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web
rm src/features/bot/actions/approve-bot-join.ts
rm src/features/bot/actions/deny-bot-join.ts
rm src/features/bot/hooks/use-bot-consent-notification.ts
rm src/server/validation/bot/approve-bot-join.schema.ts
rm src/server/validation/bot/deny-bot-join.schema.ts
rm src/features/bot/components/bot-consent-notification.tsx
rm src/features/bot/components/bot-consent-notification-actions.tsx
rm src/features/bot/components/bot-consent-notification-content.tsx
rm src/features/bot/lib/bot-notification-metadata.ts
rm src/features/meetings/components/add-bot-consent-dialog.tsx
```

- [ ] **Step 2: Fix all broken imports**

Search for any file that imports from deleted files and remove those imports + usages. Key files to check:

- `src/features/notifications/components/notification-item.tsx` — remove `BotConsentNotification` import and its rendering block
- `src/features/meetings/components/meeting-details-modal.tsx` — remove `AddBotConsentDialog` import and rendering
- `src/features/meetings/components/add-bot-button.tsx` — remove any consent dialog references

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove consent flow files and fix broken imports"
```

---

## Task 4: Code Removal — Remove `pending_consent` and `autoJoinEnabled` References

**Files:**

- Modify: `src/server/validation/bot/bot-settings.schema.ts:10-11`
- Modify: `src/server/data-access/bot-settings.queries.ts:75-76`
- Modify: `src/server/cache/bot-settings.cache.ts:63-64`
- Modify: `src/features/bot/actions/update-bot-settings.ts:44-45`
- Modify: `src/features/bot/components/bot-configuration-form.tsx:54-55,67-68,108-154`
- Modify: `src/features/bot/components/enable-bot-toggle.tsx:59-60`
- Modify: `src/features/bot/components/bot-status-badge.tsx:69-76`
- Modify: `src/features/bot/components/bot-session-card.tsx:83`
- Modify: `src/features/bot/actions/cancel-bot-session.ts:67`
- Modify: `src/features/meetings/actions/add-bot-to-meeting.ts:23,128-140`
- Modify: `src/features/meetings/actions/remove-bot-from-meeting.ts:16`
- Modify: `src/features/meetings/hooks/use-add-bot-to-meeting.ts:22,80-83`
- Modify: `src/features/meetings/hooks/use-meeting-status-counts.ts:20,33-34`
- Modify: `src/features/meetings/components/meetings-filter.tsx:32`
- Modify: `src/features/meetings/components/meeting-details-modal.tsx:157-169,182,227-237`
- Modify: `src/features/meetings/components/add-bot-button.tsx:55,78`
- Modify: `src/features/meetings/lib/calendar-utils.ts:213,236,295-296`
- Modify: `src/server/services/bot-webhook.service.ts:234-242`
- Modify: `src/server/services/bot-providers/recall/status-mapper.ts:19-20,36`
- Modify: `src/features/notifications/components/notification-icon.tsx:26-27`
- Modify: `src/server/dto/notification.dto.ts:9`
- Modify: `src/features/notifications/types.ts:9`
- Modify: `src/app/(main)/bot/sessions/page.tsx:17`

- [ ] **Step 1: Remove `autoJoinEnabled` and `requirePerMeetingConsent` from Zod schema**

In `src/server/validation/bot/bot-settings.schema.ts`, remove lines 10-11.

- [ ] **Step 2: Remove fields from data access layer**

In `src/server/data-access/bot-settings.queries.ts`, remove lines 75-76 from the upsert's `set()` call.

- [ ] **Step 3: Remove fields from cache defaults**

In `src/server/cache/bot-settings.cache.ts`, remove lines 63-64.

- [ ] **Step 4: Remove fields from update bot settings action**

In `src/features/bot/actions/update-bot-settings.ts`, remove lines 44-45.

- [ ] **Step 5: Remove toggles from bot configuration form**

In `src/features/bot/components/bot-configuration-form.tsx`:

- Remove `autoJoinEnabled` and `requirePerMeetingConsent` from the `defaultValues` (lines 54-55)
- Remove them from the `useEffect` reset (lines 67-68)
- Remove the auto-join toggle FormField (lines 108-129)
- Remove the per-meeting consent toggle FormField (lines 132-154)

- [ ] **Step 6: Remove `autoJoinEnabled` from enable bot toggle**

In `src/features/bot/components/enable-bot-toggle.tsx`, simplify lines 59-60 by removing `autoJoinEnabled` and `requirePerMeetingConsent` from the settings update object.

- [ ] **Step 7: Remove `pending_consent` from bot status badge**

In `src/features/bot/components/bot-status-badge.tsx`, remove the `pending_consent` object at lines 69-76.

- [ ] **Step 8: Remove `pending_consent` from bot session card**

In `src/features/bot/components/bot-session-card.tsx`, remove `session.botStatus === "pending_consent"` from the `canCancel` condition at line 83.

- [ ] **Step 9: Remove `pending_consent` from cancel and remove actions**

In `src/features/bot/actions/cancel-bot-session.ts`, remove `"pending_consent"` from the cancellable statuses array at line 67.

In `src/features/meetings/actions/remove-bot-from-meeting.ts`, remove `"pending_consent"` from `STATUSES_REQUIRING_TERMINATION` at line 16.

- [ ] **Step 10: Remove consent flow from add-bot-to-meeting action**

In `src/features/meetings/actions/add-bot-to-meeting.ts`:

- Remove `consentGiven` from the Zod schema at line 23
- Remove the `requirePerMeetingConsent` destructuring at line 128
- Remove the consent check block at lines 135-140
- Always create sessions as `"scheduled"`

- [ ] **Step 11: Remove consent from use-add-bot-to-meeting hook**

In `src/features/meetings/hooks/use-add-bot-to-meeting.ts`:

- Remove `consentGiven` from the interface at line 22
- Remove the consent check condition at lines 80-83

- [ ] **Step 12: Remove `pending_consent` from meeting status counts**

In `src/features/meetings/hooks/use-meeting-status-counts.ts`, remove `pending_consent: 0` at line 20 and the `pending_consent` counting logic at lines 33-34.

- [ ] **Step 13: Remove "Pending Consent" from meetings filter**

In `src/features/meetings/components/meetings-filter.tsx`, remove the `pending_consent` filter option at line 32.

- [ ] **Step 14: Remove consent from meeting details modal**

In `src/features/meetings/components/meeting-details-modal.tsx`:

- Remove the `AddBotConsentDialog` import
- Remove consent handling logic at lines 157-169
- Remove `consentGiven: true` at line 182
- Remove `AddBotConsentDialog` rendering at lines 227-237

- [ ] **Step 15: Remove consent from add-bot-button**

In `src/features/meetings/components/add-bot-button.tsx`:

- Remove consent-related comment at line 55
- Remove `consentGiven: true` at line 78

- [ ] **Step 16: Remove `pending_consent` from calendar-utils**

In `src/features/meetings/lib/calendar-utils.ts`:

- Remove `"pending_consent"` from the `MeetingBotStatusFilter` type at line 213
- Remove `"pending_consent"` from `VALID_BOT_STATUS_FILTERS` at line 236
- Remove the `case "pending_consent"` at lines 295-296

- [ ] **Step 17: Remove `pending_consent` from webhook service**

In `src/server/services/bot-webhook.service.ts`, remove the `pending_consent` conditional block at lines 234-242.

- [ ] **Step 18: Remap Recall.ai status mapper**

In `src/server/services/bot-providers/recall/status-mapper.ts`:

- Change line 19 from `pending: "pending_consent"` to `pending: "scheduled"`
- Remove line 20 (`pending_consent: "pending_consent"`)
- Change line 36 from `"bot.recording_permission_denied": "pending_consent"` to `"bot.recording_permission_denied": "failed"`

- [ ] **Step 19: Remove `pending_consent` from notification components**

In `src/features/notifications/components/notification-icon.tsx`, remove the `case "bot_consent_request"` at lines 26-27.

In `src/server/dto/notification.dto.ts`, update the comment at line 9 to remove the `bot_consent_request` reference.

In `src/features/notifications/types.ts`, update the comment at line 9 to remove the `bot_consent_request` reference.

- [ ] **Step 20: Confirm `bot_consent_request` stays in notification enum**

In `src/server/db/schema/notifications.ts`, **do NOT remove** `"bot_consent_request"` from `notificationTypeEnum`. It must stay for backward compatibility with existing database rows. The migration will update existing rows to `"info"` type, but the enum value must remain until a future cleanup migration.

- [ ] **Step 21: Remove `pending_consent` from bot sessions page**

In `src/app/(main)/bot/sessions/page.tsx`, remove `"pending_consent"` from the `ACTIVE_STATUSES` array at line 17.

- [ ] **Step 22: Verify TypeScript compiles**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm typecheck
```

Fix any remaining type errors from the removals.

- [ ] **Step 23: Commit**

```bash
git add -A
git commit -m "refactor: remove autoJoinEnabled, requirePerMeetingConsent, and pending_consent references"
```

---

## Task 5: Calendar Provider — Add `recurringSeriesId` and `getSeriesInstances()`

**Files:**

- Modify: `src/server/services/calendar/types.ts:7-17`
- Modify: `src/server/services/calendar/calendar-provider.ts:10-36`
- Modify: `src/server/services/calendar/google-calendar.provider.ts:23-37,60-108`
- Modify: `src/server/services/google-calendar.service.ts:75-95,997-1048`
- Modify: `src/server/services/calendar/microsoft-calendar.provider.ts:41-53,140,405`

- [ ] **Step 1: Add `recurringSeriesId` to shared CalendarEvent type**

In `src/server/services/calendar/types.ts`, add to the `CalendarEvent` interface:

```typescript
recurringSeriesId?: string; // Google: recurringEventId, Microsoft: seriesMasterId
```

Add new options interface:

```typescript
export interface GetSeriesInstancesOptions {
  timeMin: Date;
  timeMax: Date;
  calendarId: string;
}
```

- [ ] **Step 2: Add `getSeriesInstances()` to CalendarProvider interface**

In `src/server/services/calendar/calendar-provider.ts`, add to the interface:

```typescript
getSeriesInstances(
  userId: string,
  seriesId: string,
  options: GetSeriesInstancesOptions,
): Promise<ActionResult<CalendarEvent[]>>;
```

Import `GetSeriesInstancesOptions` from `./types`.

- [ ] **Step 3: Map `recurringEventId` in Google Calendar provider**

In `src/server/services/calendar/google-calendar.provider.ts`:

Update `mapRawEventToCalendarEvent()` to include:

```typescript
recurringSeriesId: event.recurringEventId ?? undefined,
```

Update `mapGoogleEventToCalendarEvent()` similarly — this function maps from the service's `CalendarEvent` type, so check if the service-level type includes `recurringEventId`. If not, the mapping will need to be done at the service level.

- [ ] **Step 4: Add `getSeriesInstances()` to Google Calendar service**

In `src/server/services/google-calendar.service.ts`, add a new static method:

```typescript
static async getSeriesInstances(
  userId: string,
  seriesId: string,
  options: { timeMin: Date; timeMax: Date; calendarId?: string },
): Promise<ActionResult<CalendarEvent[]>> {
  try {
    const tokenResult = await GoogleOAuthService.getValidAccessToken(userId);
    if (tokenResult.isErr()) {
      return err(
        ActionErrors.internal(
          "Failed to get valid access token",
          tokenResult.error,
          "GoogleCalendarService.getSeriesInstances",
        ),
      );
    }

    const oauth2Client = createGoogleOAuthClient();
    oauth2Client.setCredentials({ access_token: tokenResult.value });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const calendarId = options.calendarId || "primary";
    const meetings: CalendarEvent[] = [];
    let pageToken: string | undefined;

    do {
      const response = await calendar.events.instances({
        calendarId,
        eventId: seriesId,
        timeMin: options.timeMin.toISOString(),
        timeMax: options.timeMax.toISOString(),
        maxResults: 250,
        pageToken,
      });

      pageToken = response.data.nextPageToken ?? undefined;

      if (!response.data.items) continue;

      for (const event of response.data.items) {
        const meetingUrl = extractMeetingUrl(event);
        if (!meetingUrl || !event.id) continue;

        const startDate = event.start?.dateTime
          ? new Date(event.start.dateTime)
          : event.start?.date
            ? new Date(event.start.date)
            : null;
        const endDate = event.end?.dateTime
          ? new Date(event.end.dateTime)
          : event.end?.date
            ? new Date(event.end.date)
            : null;

        if (!startDate || !endDate) continue;

        meetings.push({
          id: event.id,
          title: event.summary || "Untitled Event",
          start: startDate,
          end: endDate,
          meetingUrl,
          attendees: event.attendees?.map((a) => ({
            email: a.email || "",
            responseStatus: a.responseStatus || "needsAction",
          })),
          organizer: event.organizer
            ? { email: event.organizer.email || "" }
            : undefined,
          isOrganizer: event.organizer?.self ?? undefined,
          calendarId,
        });
      }
    } while (pageToken);

    return ok(meetings);
  } catch (error) {
    return err(
      ActionErrors.internal(
        "Failed to get series instances",
        error as Error,
        "GoogleCalendarService.getSeriesInstances",
      ),
    );
  }
}
```

- [ ] **Step 5: Implement `getSeriesInstances()` in Google Calendar provider**

In `src/server/services/calendar/google-calendar.provider.ts`, add:

```typescript
async getSeriesInstances(
  userId: string,
  seriesId: string,
  options: GetSeriesInstancesOptions,
): Promise<ActionResult<CalendarEvent[]>> {
  const result = await GoogleCalendarService.getSeriesInstances(userId, seriesId, {
    timeMin: options.timeMin,
    timeMax: options.timeMax,
    calendarId: options.calendarId,
  });

  if (result.isErr()) {
    return err(result.error);
  }

  return ok(result.value.map(mapGoogleEventToCalendarEvent));
}
```

Import `GetSeriesInstancesOptions` from `./types`.

- [ ] **Step 6: Add `seriesMasterId` to Microsoft Graph provider**

In `src/server/services/calendar/microsoft-calendar.provider.ts`:

Add `seriesMasterId` to `GraphEvent` interface (after line 52):

```typescript
seriesMasterId?: string;
```

Update `selectFields` in `getUpcomingMeetings()` (line 140) to include `seriesMasterId`:

```typescript
const selectFields =
  "id,subject,start,end,onlineMeeting,location,bodyPreview,attendees,organizer,isOrganizer,seriesMasterId";
```

Update `selectFields` in `getEvent()` (line 405) similarly.

In the `mapGraphEventToCalendarEvent()` function (or wherever `GraphEvent` is mapped to `CalendarEvent`), add:

```typescript
recurringSeriesId: graphEvent.seriesMasterId ?? undefined,
```

- [ ] **Step 7: Implement `getSeriesInstances()` in Microsoft provider**

In `src/server/services/calendar/microsoft-calendar.provider.ts`, add:

```typescript
async getSeriesInstances(
  userId: string,
  seriesId: string,
  options: GetSeriesInstancesOptions,
): Promise<ActionResult<CalendarEvent[]>> {
  try {
    const tokenResult = await MicrosoftOAuthService.getValidAccessToken(userId);
    if (tokenResult.isErr()) {
      return err(tokenResult.error);
    }

    const startDateTime = options.timeMin.toISOString();
    const endDateTime = options.timeMax.toISOString();
    const selectFields =
      "id,subject,start,end,onlineMeeting,location,bodyPreview,attendees,organizer,isOrganizer,seriesMasterId";
    const calendarPath = options.calendarId
      ? `/me/calendars/${options.calendarId}/events/${seriesId}/instances`
      : `/me/events/${seriesId}/instances`;

    // graphRequest returns ActionResult<T> — must unwrap with isErr()/value
    const result = await graphRequest<{ value: GraphEvent[] }>(
      tokenResult.value,
      "GET",
      `${calendarPath}?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$select=${selectFields}`,
    );

    if (result.isErr()) {
      return err(result.error);
    }

    const events: CalendarEvent[] = result.value.value.map((graphEvent) =>
      mapGraphEventToCalendarEvent(graphEvent, options.calendarId),
    );

    return ok(events);
  } catch (error) {
    logger.error("Failed to get series instances from Microsoft", {
      component: "MicrosoftCalendarProvider.getSeriesInstances",
      userId,
      seriesId,
      error,
    });
    return err(
      ActionErrors.internal(
        "Failed to get series instances",
        error as Error,
        "MicrosoftCalendarProvider.getSeriesInstances",
      ),
    );
  }
}
```

- [ ] **Step 8: Map `recurringEventId` in Google Calendar service event results**

In `src/server/services/google-calendar.service.ts`:

**8a.** Add `recurringEventId` to the service-level `CalendarEvent` interface (around line 94, before `calendarId`):

```typescript
/** For recurring event instances, the ID of the parent recurring series */
recurringEventId?: string;
```

**8b.** In `getUpcomingMeetings()`, add `recurringEventId` to the event object pushed at line 1033-1048:

```typescript
recurringEventId: event.recurringEventId ?? undefined,
```

Add this after the `calendarId` field in the `meetings.push({...})` call.

**8c.** In `mapGoogleEventToCalendarEvent()` in `google-calendar.provider.ts`, map the service-level field:

```typescript
recurringSeriesId: event.recurringEventId ?? undefined,
```

**8d.** In `getSeriesInstances()` (added in Step 4), also include `recurringSeriesId` in each pushed event:

```typescript
recurringSeriesId: seriesId, // All instances belong to this series
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm typecheck
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(calendar): add recurringSeriesId mapping and getSeriesInstances() to providers"
```

---

## Task 6: Data Access — `bot-series-subscriptions.queries.ts`

**Files:**

- Create: `src/server/data-access/bot-series-subscriptions.queries.ts`

- [ ] **Step 1: Create the data access file**

```typescript
// src/server/data-access/bot-series-subscriptions.queries.ts
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  botSeriesSubscriptions,
  type BotSeriesSubscription,
  type NewBotSeriesSubscription,
} from "../db/schema/bot-series-subscriptions";
import { botSettings } from "../db/schema/bot-settings";

export class BotSeriesSubscriptionsQueries {
  static async findById(id: string): Promise<BotSeriesSubscription | null> {
    const result = await db
      .select()
      .from(botSeriesSubscriptions)
      .where(eq(botSeriesSubscriptions.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  static async findByUserAndOrg(
    userId: string,
    organizationId: string,
  ): Promise<BotSeriesSubscription[]> {
    return db
      .select()
      .from(botSeriesSubscriptions)
      .where(
        and(
          eq(botSeriesSubscriptions.userId, userId),
          eq(botSeriesSubscriptions.organizationId, organizationId),
          eq(botSeriesSubscriptions.active, true),
        ),
      );
  }

  static async findByUserAndSeriesId(
    userId: string,
    recurringSeriesId: string,
    organizationId: string,
  ): Promise<BotSeriesSubscription | null> {
    const result = await db
      .select()
      .from(botSeriesSubscriptions)
      .where(
        and(
          eq(botSeriesSubscriptions.userId, userId),
          eq(botSeriesSubscriptions.recurringSeriesId, recurringSeriesId),
          eq(botSeriesSubscriptions.organizationId, organizationId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find all active subscriptions where the user also has botEnabled: true.
   * Groups by (userId, organizationId) for the calendar monitor.
   */
  static async findAllActiveWithBotEnabled(): Promise<
    Array<
      BotSeriesSubscription & {
        botDisplayName: string;
        botJoinMessage: string | null;
      }
    >
  > {
    return db
      .select({
        id: botSeriesSubscriptions.id,
        userId: botSeriesSubscriptions.userId,
        organizationId: botSeriesSubscriptions.organizationId,
        recurringSeriesId: botSeriesSubscriptions.recurringSeriesId,
        calendarProvider: botSeriesSubscriptions.calendarProvider,
        calendarId: botSeriesSubscriptions.calendarId,
        seriesTitle: botSeriesSubscriptions.seriesTitle,
        active: botSeriesSubscriptions.active,
        createdAt: botSeriesSubscriptions.createdAt,
        updatedAt: botSeriesSubscriptions.updatedAt,
        botDisplayName: botSettings.botDisplayName,
        botJoinMessage: botSettings.botJoinMessage,
      })
      .from(botSeriesSubscriptions)
      .innerJoin(
        botSettings,
        and(
          eq(botSeriesSubscriptions.userId, botSettings.userId),
          eq(botSeriesSubscriptions.organizationId, botSettings.organizationId),
        ),
      )
      .where(
        and(
          eq(botSeriesSubscriptions.active, true),
          eq(botSettings.botEnabled, true),
        ),
      );
  }

  static async insert(
    subscription: NewBotSeriesSubscription,
  ): Promise<BotSeriesSubscription> {
    const [created] = await db
      .insert(botSeriesSubscriptions)
      .values(subscription)
      .returning();

    return created;
  }

  static async update(
    id: string,
    updates: Partial<Omit<BotSeriesSubscription, "id" | "createdAt">>,
  ): Promise<BotSeriesSubscription | null> {
    const [updated] = await db
      .update(botSeriesSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(botSeriesSubscriptions.id, id))
      .returning();

    return updated ?? null;
  }

  static async deactivate(id: string): Promise<BotSeriesSubscription | null> {
    return this.update(id, { active: false });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/data-access/bot-series-subscriptions.queries.ts
git commit -m "feat(data-access): add BotSeriesSubscriptionsQueries"
```

---

## Task 7: Backfill Service — Shared Logic for Creating Bot Sessions from Series

**Files:**

- Create: `src/server/services/bot-backfill.service.ts`

- [ ] **Step 1: Create the backfill service**

This service is shared between the subscribe action (immediate backfill) and the daily cron.

```typescript
// src/server/services/bot-backfill.service.ts
import { err, ok } from "neverthrow";
import { logger, serializeError } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import type { BotSeriesSubscription } from "@/server/db/schema/bot-series-subscriptions";
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import { BotProviderFactory } from "@/server/services/bot-providers/factory";
import {
  getCalendarProvider,
  getMeetingLinkProvider,
  type ProviderType,
} from "@/server/services/calendar/calendar-provider-factory";
import { MeetingService } from "@/server/services/meeting.service";

interface BackfillResult {
  sessionsCreated: number;
  errors: Array<{ instanceId: string; error: string }>;
}

export class BotBackfillService {
  /**
   * Backfill bot sessions for a single subscription within a time range.
   */
  static async backfillSubscription(
    subscription: BotSeriesSubscription & {
      botDisplayName: string;
      botJoinMessage: string | null;
    },
    timeRange: { timeMin: Date; timeMax: Date },
  ): Promise<ActionResult<BackfillResult>> {
    const result: BackfillResult = { sessionsCreated: 0, errors: [] };

    try {
      const providerType = subscription.calendarProvider as ProviderType;

      const calendarResult = await getCalendarProvider(
        subscription.userId,
        providerType,
      );
      if (calendarResult.isErr()) {
        return err(calendarResult.error);
      }

      const meetingLinkResult = await getMeetingLinkProvider(
        subscription.userId,
        providerType,
      );
      if (meetingLinkResult.isErr()) {
        return err(meetingLinkResult.error);
      }

      const { provider: calendarProvider } = calendarResult.value;
      const { provider: meetingLinkProvider } = meetingLinkResult.value;

      // Fetch all instances of this series in the time range
      const instancesResult = await calendarProvider.getSeriesInstances(
        subscription.userId,
        subscription.recurringSeriesId,
        {
          timeMin: timeRange.timeMin,
          timeMax: timeRange.timeMax,
          calendarId: subscription.calendarId,
        },
      );

      if (instancesResult.isErr()) {
        return err(instancesResult.error);
      }

      const instances = instancesResult.value;

      if (instances.length === 0) {
        return ok(result);
      }

      // Refresh denormalized seriesTitle if it changed
      const firstInstance = instances[0];
      if (
        firstInstance?.title &&
        firstInstance.title !== subscription.seriesTitle
      ) {
        await BotSeriesSubscriptionsQueries.update(subscription.id, {
          seriesTitle: firstInstance.title,
        });
      }

      // Batch dedup by calendarEventId
      const instanceIds = instances.map((i) => i.id);
      const existingSessions = await BotSessionsQueries.findByCalendarEventIds(
        instanceIds,
        subscription.organizationId,
      );

      // Dedup by meetingUrl
      const instanceUrls = instances
        .map((i) => {
          const url = meetingLinkProvider.extractMeetingUrl(i);
          return url;
        })
        .filter(Boolean) as string[];
      const existingUrls = await BotSessionsQueries.findByMeetingUrls(
        instanceUrls,
        subscription.organizationId,
      );

      // Find project for this org
      const project = await ProjectQueries.findFirstActiveByOrganization(
        subscription.organizationId,
      );
      if (!project) {
        return err(
          ActionErrors.notFound(
            "No active project found",
            "BotBackfillService.backfillSubscription",
          ),
        );
      }

      const botProvider = BotProviderFactory.getDefault();

      for (const instance of instances) {
        try {
          // Skip if already has a session
          if (existingSessions.has(instance.id)) continue;

          const meetingUrl = meetingLinkProvider.extractMeetingUrl(instance);
          if (!meetingUrl) continue;
          if (existingUrls.has(meetingUrl)) continue;

          if (!instance.start) continue;

          const joinAt = new Date(instance.start.getTime() - 15 * 1000);

          // Create bot session via provider
          const sessionResult = await botProvider.createSession({
            meetingUrl,
            joinAt,
            customMetadata: {
              projectId: project.id,
              organizationId: subscription.organizationId,
              userId: subscription.userId,
              calendarEventId: instance.id,
              provider: providerType,
            },
            botDisplayName: subscription.botDisplayName,
            botJoinMessage: subscription.botJoinMessage,
          });

          if (sessionResult.isErr()) {
            result.errors.push({
              instanceId: instance.id,
              error: sessionResult.error.message,
            });
            continue;
          }

          const { providerId } = sessionResult.value;

          // Persist bot session
          const session = await BotSessionsQueries.insert({
            projectId: project.id,
            organizationId: subscription.organizationId,
            userId: subscription.userId,
            recallBotId: providerId,
            recallStatus: sessionResult.value.status,
            meetingUrl,
            meetingTitle: instance.title,
            calendarEventId: instance.id,
            botStatus: "scheduled",
            subscriptionId: subscription.id,
            meetingParticipants:
              instance.attendees?.map((a) => a.email).filter(Boolean) ??
              undefined,
          });

          // Create meeting record
          const meetingResult =
            await MeetingService.findOrCreateForCalendarEvent(
              instance.id,
              subscription.organizationId,
              {
                organizationId: subscription.organizationId,
                projectId: project.id,
                createdById: subscription.userId,
                calendarEventId: instance.id,
                externalCalendarId: instance.id,
                title: instance.title || "Untitled Meeting",
                description: null,
                scheduledStartAt: instance.start ?? new Date(),
                scheduledEndAt: instance.end ?? undefined,
                status: "scheduled",
                meetingUrl,
                participants:
                  instance.attendees?.map((a) => ({
                    email: a.email,
                    name: null,
                    role: null,
                  })) ?? [],
              },
            );

          if (meetingResult.isOk()) {
            await BotSessionsQueries.update(
              session.id,
              subscription.organizationId,
              { meetingId: meetingResult.value.id },
            );
          }

          result.sessionsCreated++;
          // Mark URL as used for subsequent dedup within this batch
          existingUrls.add(meetingUrl);

          logger.info("Created bot session for series instance", {
            component: "BotBackfillService",
            subscriptionId: subscription.id,
            calendarEventId: instance.id,
            botId: providerId,
          });
        } catch (error) {
          result.errors.push({
            instanceId: instance.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return ok(result);
    } catch (error) {
      logger.error("Failed to backfill subscription", {
        component: "BotBackfillService",
        subscriptionId: subscription.id,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to backfill subscription",
          error as Error,
          "BotBackfillService.backfillSubscription",
        ),
      );
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/services/bot-backfill.service.ts
git commit -m "feat(services): add BotBackfillService for series instance backfill"
```

---

## Task 8: Server Actions — Subscribe and Unsubscribe

**Files:**

- Create: `src/server/validation/bot/subscribe-to-series.schema.ts`
- Create: `src/server/validation/bot/unsubscribe-from-series.schema.ts`
- Create: `src/features/bot/actions/subscribe-to-series.ts`
- Create: `src/features/bot/actions/unsubscribe-from-series.ts`

- [ ] **Step 1: Create Zod schemas**

```typescript
// src/server/validation/bot/subscribe-to-series.schema.ts
import { z } from "zod";

export const subscribeToSeriesSchema = z.object({
  calendarEventId: z.string().min(1),
  calendarId: z.string().min(1),
  calendarProvider: z.enum(["google", "microsoft"]),
});
```

```typescript
// src/server/validation/bot/unsubscribe-from-series.schema.ts
import { z } from "zod";

export const unsubscribeFromSeriesSchema = z.object({
  subscriptionId: z.string().uuid(),
});
```

- [ ] **Step 2: Create subscribe action**

```typescript
// src/features/bot/actions/subscribe-to-series.ts
"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { subscribeToSeriesSchema } from "@/server/validation/bot/subscribe-to-series.schema";
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";
import { BotBackfillService } from "@/server/services/bot-backfill.service";
import { BotSettingsQueries } from "@/server/data-access/bot-settings.queries";
import {
  getCalendarProvider,
  type ProviderType,
} from "@/server/services/calendar/calendar-provider-factory";

export const subscribeToSeriesAction = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create") })
  .schema(subscribeToSeriesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { calendarEventId, calendarId, calendarProvider } = parsedInput;
    const { user, organizationId } = ctx;
    const userId = user.id;

    const providerType = calendarProvider as ProviderType;

    // Resolve recurringSeriesId from the calendar event
    const calendarResult = await getCalendarProvider(userId, providerType);
    if (calendarResult.isErr()) {
      throw new Error(calendarResult.error.message);
    }

    const { provider } = calendarResult.value;
    const eventResult = await provider.getEvent(
      userId,
      calendarId,
      calendarEventId,
    );
    if (eventResult.isErr()) {
      throw new Error(eventResult.error.message);
    }

    const event = eventResult.value;
    const recurringSeriesId = event.recurringSeriesId;

    if (!recurringSeriesId) {
      throw new Error("This event is not part of a recurring series");
    }

    // Check if already subscribed (scoped to user + org + series)
    const existing = await BotSeriesSubscriptionsQueries.findByUserAndSeriesId(
      userId,
      recurringSeriesId,
      organizationId,
    );

    if (existing && existing.active) {
      throw new Error("Already subscribed to this series");
    }

    // Get bot settings for display name and join message
    const botSettingsRecord = await BotSettingsQueries.findByUserId(
      userId,
      organizationId,
    );

    // Create or reactivate subscription
    let subscription;
    if (existing && !existing.active) {
      subscription = await BotSeriesSubscriptionsQueries.update(existing.id, {
        active: true,
        seriesTitle: event.title,
      });
    } else {
      subscription = await BotSeriesSubscriptionsQueries.insert({
        userId,
        organizationId,
        recurringSeriesId,
        calendarProvider,
        calendarId,
        seriesTitle: event.title,
        active: true,
      });
    }

    if (!subscription) {
      throw new Error("Failed to create subscription");
    }

    // Trigger immediate 30-day backfill
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const backfillResult = await BotBackfillService.backfillSubscription(
      {
        ...subscription,
        botDisplayName:
          botSettingsRecord?.botDisplayName ?? "Inovy Recording Bot",
        botJoinMessage: botSettingsRecord?.botJoinMessage ?? null,
      },
      { timeMin: now, timeMax: thirtyDaysFromNow },
    );

    const sessionsCreated = backfillResult.isOk()
      ? backfillResult.value.sessionsCreated
      : 0;

    return {
      subscription,
      sessionsCreated,
    };
  });
```

- [ ] **Step 3: Create unsubscribe action**

```typescript
// src/features/bot/actions/unsubscribe-from-series.ts
"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { unsubscribeFromSeriesSchema } from "@/server/validation/bot/unsubscribe-from-series.schema";
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { BotProviderFactory } from "@/server/services/bot-providers/factory";
import { logger, serializeError } from "@/lib/logger";

export const unsubscribeFromSeriesAction = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:delete") })
  .schema(unsubscribeFromSeriesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { subscriptionId } = parsedInput;
    const { organizationId } = ctx;

    // Deactivate subscription
    const subscription =
      await BotSeriesSubscriptionsQueries.deactivate(subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Cancel all pending bot sessions for this subscription
    const pendingSessions = await BotSessionsQueries.findBySubscriptionId(
      subscriptionId,
      organizationId,
      "scheduled",
    );

    const botProvider = BotProviderFactory.getDefault();
    let cancelledCount = 0;

    for (const session of pendingSessions) {
      try {
        await botProvider.terminateSession(session.recallBotId);
        await BotSessionsQueries.update(session.id, organizationId, {
          botStatus: "failed",
          error: "Subscription cancelled",
        });
        cancelledCount++;
      } catch (error) {
        logger.error("Failed to cancel bot session on unsubscribe", {
          component: "unsubscribeFromSeriesAction",
          sessionId: session.id,
          error: serializeError(error),
        });
        // Still mark as failed locally
        await BotSessionsQueries.update(session.id, organizationId, {
          botStatus: "failed",
          error: "Subscription cancelled (provider termination failed)",
        });
      }
    }

    return { cancelledSessions: cancelledCount };
  });
```

- [ ] **Step 4: Add `findBySubscriptionId` to BotSessionsQueries and update types**

In `src/server/data-access/bot-sessions.queries.ts`:

**4a.** Check the `update()` method's `Pick` type constraint. If it uses a `Pick` or `Omit` that restricts which fields can be updated, ensure `subscriptionId` is included in the allowed fields. The `insert()` method uses `NewBotSession` which will automatically include `subscriptionId` after the schema change in Task 2.

**4b.** Add the new query method:

```typescript
static async findBySubscriptionId(
  subscriptionId: string,
  organizationId: string,
  status?: string,
): Promise<BotSession[]> {
  const conditions = [
    eq(botSessions.subscriptionId, subscriptionId),
    eq(botSessions.organizationId, organizationId),
  ];

  if (status) {
    conditions.push(eq(botSessions.botStatus, status));
  }

  return db
    .select()
    .from(botSessions)
    .where(and(...conditions));
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(actions): add subscribe/unsubscribe series server actions"
```

---

## Task 9: Calendar Monitor Rewrite

**Files:**

- Modify: `src/server/services/bot-calendar-monitor.service.ts`

- [ ] **Step 1: Rewrite `bot-calendar-monitor.service.ts` completely**

Replace the entire file content with:

```typescript
// src/server/services/bot-calendar-monitor.service.ts
import { err, ok } from "neverthrow";
import { logger, serializeError } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";
import { BotBackfillService } from "@/server/services/bot-backfill.service";
import type { BotSeriesSubscription } from "@/server/db/schema/bot-series-subscriptions";

/**
 * Bot Calendar Monitor Service
 * Monitors subscribed recurring series for upcoming instances
 * and creates bot sessions for them.
 */
export class BotCalendarMonitorService {
  /**
   * Monitor calendars for all users with active series subscriptions.
   * Only processes users who also have botEnabled: true.
   */
  static async monitorCalendars(): Promise<
    ActionResult<{
      usersProcessed: number;
      sessionsCreated: number;
      errors: Array<{ userId: string; error: string }>;
    }>
  > {
    try {
      logger.info("Starting calendar monitoring workflow", {
        component: "BotCalendarMonitorService.monitorCalendars",
      });

      // Get all active subscriptions where user has botEnabled: true
      const subscriptions =
        await BotSeriesSubscriptionsQueries.findAllActiveWithBotEnabled();

      // Group subscriptions by (userId, organizationId)
      const grouped = new Map<
        string,
        {
          botSettings: {
            userId: string;
            organizationId: string;
            botDisplayName: string;
            botJoinMessage: string | null;
          };
          subscriptions: Array<
            BotSeriesSubscription & {
              botDisplayName: string;
              botJoinMessage: string | null;
            }
          >;
        }
      >();

      for (const sub of subscriptions) {
        const key = `${sub.userId}:${sub.organizationId}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            botSettings: {
              userId: sub.userId,
              organizationId: sub.organizationId,
              botDisplayName: sub.botDisplayName,
              botJoinMessage: sub.botJoinMessage,
            },
            subscriptions: [],
          });
        }
        grouped.get(key)!.subscriptions.push(sub);
      }

      logger.info("Found users with active subscriptions", {
        component: "BotCalendarMonitorService.monitorCalendars",
        userCount: grouped.size,
        totalSubscriptions: subscriptions.length,
      });

      const results = {
        usersProcessed: 0,
        sessionsCreated: 0,
        errors: [] as Array<{ userId: string; error: string }>,
      };

      // Time window: 10-20 minutes from now (same as before)
      const now = new Date();
      const timeMin = new Date(now.getTime() + (10 * 60 + 15 + 5) * 1000);
      const timeMax = new Date(now.getTime() + 20 * 60 * 1000);

      for (const [, { botSettings, subscriptions: userSubs }] of grouped) {
        try {
          let userSessionsCreated = 0;

          for (const subscription of userSubs) {
            const backfillResult =
              await BotBackfillService.backfillSubscription(subscription, {
                timeMin,
                timeMax,
              });

            if (backfillResult.isOk()) {
              userSessionsCreated += backfillResult.value.sessionsCreated;
            } else {
              logger.error("Failed to process subscription", {
                component: "BotCalendarMonitorService.monitorCalendars",
                userId: botSettings.userId,
                subscriptionId: subscription.id,
                error: backfillResult.error.message,
              });
            }
          }

          results.usersProcessed++;
          results.sessionsCreated += userSessionsCreated;
        } catch (error) {
          logger.error("Error processing user subscriptions", {
            component: "BotCalendarMonitorService.monitorCalendars",
            userId: botSettings.userId,
            error: serializeError(error),
          });

          results.errors.push({
            userId: botSettings.userId,
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      }

      logger.info("Calendar monitoring workflow completed", {
        component: "BotCalendarMonitorService.monitorCalendars",
        results,
      });

      return ok(results);
    } catch (error) {
      logger.error("Failed to monitor calendars", {
        component: "BotCalendarMonitorService.monitorCalendars",
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to monitor calendars",
          error as Error,
          "BotCalendarMonitorService.monitorCalendars",
        ),
      );
    }
  }
}
```

Note: The `processUserCalendar()` and `fetchMeetingsFromProvider()` private methods are removed entirely. The monitor now delegates to `BotBackfillService.backfillSubscription()` with a narrow time window instead of the 30-day window used by the daily cron.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/server/services/bot-calendar-monitor.service.ts
git commit -m "refactor(monitor): rewrite calendar monitor to use series subscriptions"
```

---

## Task 10: Daily Backfill Cron

**Files:**

- Create: `src/app/api/cron/backfill-series/route.ts`

- [ ] **Step 1: Create the cron route handler**

Follow the same pattern as `src/app/api/cron/monitor-calendar/route.ts`:

```typescript
// src/app/api/cron/backfill-series/route.ts
import { logger } from "@/lib/logger";
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";
import { BotBackfillService } from "@/server/services/bot-backfill.service";
import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";

export async function GET(request: NextRequest) {
  await connection();
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "GET /api/cron/backfill-series",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting series backfill cron job", {
      component: "GET /api/cron/backfill-series",
    });

    const subscriptions =
      await BotSeriesSubscriptionsQueries.findAllActiveWithBotEnabled();

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    let totalSessionsCreated = 0;
    const errors: Array<{ subscriptionId: string; error: string }> = [];

    for (const subscription of subscriptions) {
      const result = await BotBackfillService.backfillSubscription(
        subscription,
        { timeMin: now, timeMax: thirtyDaysFromNow },
      );

      if (result.isOk()) {
        totalSessionsCreated += result.value.sessionsCreated;
      } else {
        errors.push({
          subscriptionId: subscription.id,
          error: result.error.message,
        });
      }

      // Rate limiting: small delay between calendar API calls to avoid
      // hitting Google/Microsoft rate limits (spec section 4.4)
      await new Promise((r) => setTimeout(r, 200));
    }

    const duration = Date.now() - startTime;

    logger.info("Series backfill cron job completed", {
      component: "GET /api/cron/backfill-series",
      subscriptionsProcessed: subscriptions.length,
      totalSessionsCreated,
      errors: errors.length,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      subscriptionsProcessed: subscriptions.length,
      totalSessionsCreated,
      errors,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      "Error in series backfill cron job",
      {
        component: "GET /api/cron/backfill-series",
        durationMs: duration,
      },
      error as Error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        durationMs: duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Add cron schedule to vercel.json**

Check `vercel.json` for the cron configuration and add:

```json
{
  "path": "/api/cron/backfill-series",
  "schedule": "0 2 * * *"
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/backfill-series/route.ts vercel.json
git commit -m "feat(cron): add daily series backfill cron job"
```

---

## Task 11: Client Hooks for Subscriptions

**Files:**

- Create: `src/features/bot/hooks/use-subscribe-to-series.ts`
- Create: `src/features/bot/hooks/use-unsubscribe-from-series.ts`
- Create: `src/features/bot/hooks/use-series-subscriptions.ts`

- [ ] **Step 1: Create subscribe hook**

```typescript
// src/features/bot/hooks/use-subscribe-to-series.ts
"use client";

import { useAction } from "next-safe-action/hooks";
import { subscribeToSeriesAction } from "../actions/subscribe-to-series";
import { toast } from "sonner";

export function useSubscribeToSeries() {
  const { execute, isExecuting } = useAction(subscribeToSeriesAction, {
    onSuccess: ({ data }) => {
      toast.success(
        `Subscribed! ${data?.sessionsCreated ?? 0} recording sessions scheduled.`,
      );
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to subscribe to series");
    },
  });

  return { subscribe: execute, isSubscribing: isExecuting };
}
```

- [ ] **Step 2: Create unsubscribe hook**

```typescript
// src/features/bot/hooks/use-unsubscribe-from-series.ts
"use client";

import { useAction } from "next-safe-action/hooks";
import { unsubscribeFromSeriesAction } from "../actions/unsubscribe-from-series";
import { toast } from "sonner";

export function useUnsubscribeFromSeries() {
  const { execute, isExecuting } = useAction(unsubscribeFromSeriesAction, {
    onSuccess: ({ data }) => {
      toast.success(
        `Unsubscribed. ${data?.cancelledSessions ?? 0} pending sessions cancelled.`,
      );
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to unsubscribe from series");
    },
  });

  return { unsubscribe: execute, isUnsubscribing: isExecuting };
}
```

- [ ] **Step 3: Create subscriptions list hook**

This hook fetches the user's active subscriptions. Create a server action to query them:

```typescript
// src/features/bot/hooks/use-series-subscriptions.ts
//
// NOTE: Per project guidelines, prefer fetching subscriptions in a Server
// Component with 'use cache' and passing them as props to client components.
// This hook is provided as a fallback for cases where server component
// data fetching is not practical (e.g., after a subscribe/unsubscribe
// mutation that needs to refetch). Use getSeriesSubscriptionsAction
// directly from a server component where possible.
"use client";

import { useAction } from "next-safe-action/hooks";
import type { BotSeriesSubscription } from "@/server/db/schema/bot-series-subscriptions";
import { getSeriesSubscriptionsAction } from "../actions/get-series-subscriptions";
import { useCallback, useEffect, useState } from "react";

export function useSeriesSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<BotSeriesSubscription[]>(
    [],
  );

  const { execute, isExecuting } = useAction(getSeriesSubscriptionsAction, {
    onSuccess: ({ data }) => {
      if (data) setSubscriptions(data);
    },
  });

  useEffect(() => {
    execute();
  }, [execute]);

  const refetch = useCallback(() => execute(), [execute]);

  return { subscriptions, isLoading: isExecuting, refetch };
}
```

**Important:** The bot settings page should fetch subscriptions in a Server Component and pass them as props. Create a cached data-fetching function:

```typescript
// src/features/bot/data/get-series-subscriptions.ts
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";

export async function getSeriesSubscriptions(
  userId: string,
  organizationId: string,
) {
  "use cache";

  return BotSeriesSubscriptionsQueries.findByUserAndOrg(userId, organizationId);
}
```

Also create the corresponding server action:

```typescript
// src/features/bot/actions/get-series-subscriptions.ts
"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";

export const getSeriesSubscriptionsAction = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:read") })
  .action(async ({ ctx }) => {
    const { user, organizationId } = ctx;

    return BotSeriesSubscriptionsQueries.findByUserAndOrg(
      user.id,
      organizationId,
    );
  });
```

- [ ] **Step 4: Commit**

```bash
git add src/features/bot/hooks/use-subscribe-to-series.ts src/features/bot/hooks/use-unsubscribe-from-series.ts src/features/bot/hooks/use-series-subscriptions.ts src/features/bot/actions/get-series-subscriptions.ts
git commit -m "feat(hooks): add client hooks for series subscriptions"
```

---

## Task 12: UI — Series Subscription Toggle on Meeting Cards

**Files:**

- Modify: Meeting card/list components where recurring meetings are displayed

- [ ] **Step 1: Identify the meeting card component**

Check how meetings are rendered in the meetings list. The toggle should appear when `recurringSeriesId` is present on a calendar event. Look at the meeting card or meeting list item component and add a "Record all occurrences" / "Stop recording" button.

- [ ] **Step 2: Add subscription toggle UI**

Add a button or menu item that:

- Shows "Record all occurrences" when not subscribed (calls `useSubscribeToSeries`)
- Shows "Stop recording this series" when subscribed (calls `useUnsubscribeFromSeries`)
- Check subscription status by comparing the event's `recurringSeriesId` against the user's active subscriptions

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): add series subscription toggle to meeting cards"
```

---

## Task 13: UI — Subscription Management in Bot Settings

**Files:**

- Modify: `src/features/bot/components/bot-configuration-form.tsx` or the bot settings page

- [ ] **Step 1: Add subscriptions list section**

In the bot settings page, add a new section below the existing settings that shows:

- A list of active series subscriptions using `useSeriesSubscriptions()`
- Each row shows: series title, calendar provider icon, `active` toggle
- A "Remove" button that calls `useUnsubscribeFromSeries()`

- [ ] **Step 2: Style with Shadcn UI components**

Use `Card`, `Badge`, `Button`, and `Switch` components to build the subscription list. Follow existing patterns in the bot settings page.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): add subscription management to bot settings page"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Run typecheck**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm typecheck
```

- [ ] **Step 2: Run linter**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm lint
```

Fix any new warnings or errors introduced.

- [ ] **Step 3: Run build**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm build
```

- [ ] **Step 4: Verify no remaining references to removed features**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && grep -r "autoJoinEnabled\|auto_join_enabled\|requirePerMeetingConsent\|require_per_meeting_consent\|pending_consent" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "migrations" | grep -v "snapshot"
```

Should return no results (migrations and snapshots are excluded since they're historical).

- [ ] **Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```
