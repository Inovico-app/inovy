# Recurring Series Bot Subscriptions

**Date:** 2026-03-20
**Linear:** INO2-524 — Introduce possibility to add and remove a bot to all meetings in a recurring series
**Status:** Approved

## Summary

Replace the global `autoJoinEnabled` toggle and `requirePerMeetingConsent` flow with explicit per-series bot subscriptions. Users subscribe to specific recurring meeting series, and the bot automatically joins every instance of those series. Unsubscribing cancels all pending bot sessions for that series.

## Goals

- Users can selectively record specific recurring meeting series without recording all meetings
- Subscribing immediately backfills bot sessions for the next 30 days
- A daily cron rolls the 30-day window forward, catching new instances
- Remove unused `autoJoinEnabled` and `requirePerMeetingConsent` features and all related code

## Non-Goals

- Recording non-recurring (one-off) meetings is unchanged — users still manually add a bot
- No changes to the Recall.ai bot provider integration
- No changes to the recording/transcription workflow pipeline

---

## 1. Data Model

### 1.1 New table: `bot_series_subscriptions`

| Column              | Type                                     | Notes                                                          |
| ------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| `id`                | uuid PK                                  | Default random                                                 |
| `userId`            | text, not null                           | Better Auth user ID                                            |
| `organizationId`    | text, not null                           | Tenant isolation                                               |
| `recurringSeriesId` | text, not null                           | Google `recurringEventId` / Microsoft `seriesMasterId`         |
| `calendarProvider`  | text ("google" \| "microsoft"), not null | Source calendar provider                                       |
| `calendarId`        | text, not null                           | Which calendar the series lives on                             |
| `seriesTitle`       | text                                     | Denormalized for display; refreshed by daily backfill          |
| `active`            | boolean, default true                    | Soft toggle for pause/resume; pausing cancels pending sessions |
| `createdAt`         | timestamp with tz                        |                                                                |
| `updatedAt`         | timestamp with tz                        |                                                                |

**Unique constraint:** `(userId, organizationId, recurringSeriesId)`

Note: `calendarProvider` is excluded from the unique constraint because `recurringSeriesId` values are already provider-specific (Google's format differs from Microsoft's), so collisions across providers are impossible.

**Indexes:**

- `(userId, organizationId, active)` — calendar monitor lookups
- `(organizationId, recurringSeriesId)` — deduplication checks

### 1.2 Schema removals

**`bot_settings` table:**

- Drop `auto_join_enabled` column
- Drop `require_per_meeting_consent` column

**`bot_sessions` table:**

- Remove `"pending_consent"` from `botStatusEnum` → becomes `["scheduled", "joining", "active", "leaving", "completed", "failed"]`
- Add `subscriptionId` column (uuid, nullable, FK to `bot_series_subscriptions.id`, `onDelete: "set null"`) — tracks whether a session was created via a series subscription. Enables efficient cleanup on unsubscribe.
- Note: `botStatusEnum` is a TypeScript-level `const` array used in a Drizzle `text()` column with enum validation, not a PostgreSQL `CREATE TYPE` enum. The migration only needs to update existing data rows, not alter a PG enum.

### 1.3 Type additions

**`CalendarEvent` (shared type in `calendar/types.ts`):**

```typescript
recurringSeriesId?: string; // Google: recurringEventId, Microsoft: seriesMasterId
```

### 1.4 Migration

Single migration file that:

1. Creates `bot_series_subscriptions` table with constraints and indexes
2. Adds `subscription_id` column to `bot_sessions` (nullable FK)
3. Updates any existing `bot_sessions` rows with `bot_status = 'pending_consent'` to `'failed'`
4. Updates any existing `notifications` rows with `type = 'bot_consent_request'` to `type = 'info'` (preserves historical data)
5. Drops `auto_join_enabled` and `require_per_meeting_consent` columns from `bot_settings`

Note: The `bot_consent_request` value is kept in the `notificationTypeEnum` TypeScript array for backward compatibility with existing DB rows, but no new notifications of this type will be created. It can be removed in a future cleanup migration once old notification rows are purged by data retention.

---

## 2. Calendar Provider Changes

### 2.1 Shared `CalendarEvent` type

Add `recurringSeriesId?: string` field.

### 2.2 Google Calendar Provider

- Map `recurringEventId` from `calendar_v3.Schema$Event` to `CalendarEvent.recurringSeriesId` in both `mapGoogleEventToCalendarEvent()` and `mapRawEventToCalendarEvent()`
- Add `getSeriesInstances()` method using Google's `events.instances(recurringEventId, { timeMin, timeMax })` API. Note: this API requires the **series master ID** (the `recurringEventId`), not an individual instance ID.

### 2.3 Microsoft Calendar Provider

- Add `seriesMasterId` to the `GraphEvent` interface (currently missing)
- Update `$select` query parameters in `getUpcomingMeetings()` and `getEvent()` to include `seriesMasterId` in the field list
- Map `seriesMasterId` to `CalendarEvent.recurringSeriesId`
- Add `getSeriesInstances()` method using Microsoft's `/me/calendars/{calendarId}/events/{seriesMasterId}/instances?startDateTime=...&endDateTime=...` API (for default calendar, use `/me/events/{id}/instances`)

### 2.4 CalendarProvider interface

Add new method:

```typescript
getSeriesInstances(
  userId: string,
  seriesId: string,
  options: { timeMin: Date; timeMax: Date; calendarId: string }
): Promise<ActionResult<CalendarEvent[]>>;
```

Used by the subscribe action (immediate backfill) and the daily backfill cron.

---

## 3. Calendar Monitor Rewrite

### 3.1 Current flow (removed)

1. `findAllEnabled()` — get users with `botEnabled: true`
2. Scan ALL meetings in 10-20 min window
3. Create bot sessions for every meeting found
4. Branch on `requirePerMeetingConsent` for consent flow

### 3.2 New flow

1. Fetch all active subscriptions from `bot_series_subscriptions` where the user also has `botEnabled: true` (master kill switch preserved)
2. Group subscriptions by `(userId, organizationId)`
3. For each user's subscriptions, check if any instance of each subscribed series starts in the 10-20 min window
4. Create bot sessions only for matching instances, always as `"scheduled"`, with `subscriptionId` set
5. Deduplication unchanged — by `calendarEventId` and `meetingUrl`

Note: The `calendarIds` filter from `bot_settings` is no longer used. Series subscriptions are explicit — each subscription already specifies its `calendarId`. The `calendarIds` column on `bot_settings` becomes unused and can be removed in a future cleanup.

### 3.3 `processUserCalendar()` signature change

**Before:**

```typescript
private static async processUserCalendar(settings: {
  userId: string;
  organizationId: string;
  calendarIds?: string[] | null;
  requirePerMeetingConsent: boolean;
  botDisplayName: string;
  botJoinMessage: string | null;
}): Promise<ActionResult<{ sessionsCreated: number }>>
```

**After:**

```typescript
private static async processUserCalendar(
  botSettings: { userId: string; organizationId: string; botDisplayName: string; botJoinMessage: string | null },
  subscriptions: BotSeriesSubscription[]
): Promise<ActionResult<{ sessionsCreated: number }>>
```

---

## 4. Daily Backfill Cron

### 4.1 New endpoint: `/api/cron/backfill-series`

**Schedule:** Once daily
**Auth:** Bearer token via `CRON_SECRET`

### 4.2 Flow

1. Fetch all active subscriptions (where user has `botEnabled: true`)
2. For each subscription, call `getSeriesInstances()` with 30-day window from now
3. For each instance, deduplicate by `calendarEventId`
4. Create bot sessions for new instances — status `"scheduled"`, `joinAt = start - 15s`
5. Create meeting records via `MeetingService.findOrCreateForCalendarEvent()`

### 4.3 Relationship to existing monitor cron

- **Monitor cron** (every 5 min): handles the immediate 10-20 min window with precision timing
- **Backfill cron** (daily): handles the 30-day horizon in bulk
- If backfill fails, the monitor still catches meetings as they approach — no gaps

### 4.4 Rate limiting

Process subscriptions sequentially per user with a small delay between calendar API calls to avoid hitting Google/Microsoft rate limits. If a user has many subscriptions, the backfill for that user may take longer but won't fail due to throttling.

---

## 5. Server Actions

### 5.1 New actions

**`subscribe-to-series.ts`**

- Input: `{ calendarEventId, calendarId, calendarProvider }` — any instance of the recurring series
- Resolves `recurringSeriesId` from the calendar event (via `getEvent()` or from the event's `recurringSeriesId` field)
- Validates: series exists, not already subscribed
- Creates `bot_series_subscriptions` record
- Triggers immediate 30-day backfill for this single subscription
- Returns: subscription record + count of sessions created

**`unsubscribe-from-series.ts`**

- Input: `{ subscriptionId }` or `{ recurringSeriesId, calendarProvider }`
- Sets `active: false` on the subscription
- Finds all bot sessions with `subscriptionId` matching and status `"scheduled"`
- Cancels them via `botProvider.terminateSession()` for any with a Recall bot
- Updates their status to `"failed"`

### 5.2 Removed actions

- `approve-bot-join.ts` — deleted
- `deny-bot-join.ts` — deleted

### 5.3 Modified actions

**`add-bot-to-meeting.ts`**

- Remove `requirePerMeetingConsent` check
- Remove `consentGiven` parameter and consent flow
- Always create sessions as `"scheduled"`

**`update-bot-settings.ts`**

- Remove `autoJoinEnabled` and `requirePerMeetingConsent` from input/output

**`cancel-bot-session.ts`**

- Remove `"pending_consent"` from cancellable statuses list

**`remove-bot-from-meeting.ts`**

- Remove `"pending_consent"` from cancellable statuses list

---

## 6. UI Changes

### 6.1 Series subscription toggle

On the meetings list/calendar view, when a meeting has `recurringSeriesId`:

- Show a **"Record all occurrences"** action (button or menu item)
- When already subscribed, show **"Stop recording this series"**

### 6.2 Subscription management in bot settings

In the bot settings page, add a section listing all active series subscriptions:

- Series title, calendar provider icon, count of upcoming scheduled sessions
- Toggle to pause/resume (`active` flag)
- Button to remove subscription entirely

### 6.3 Removed UI elements

- **`bot-configuration-form.tsx`** — remove auto-join toggle and per-meeting consent toggle
- **`enable-bot-toggle.tsx`** — remove `autoJoinEnabled` from toggle handler
- **`bot-status-badge.tsx`** — remove `pending_consent` badge variant
- **`bot-session-card.tsx`** — remove `pending_consent` status handling
- **`meetings-filter.tsx`** — remove "Pending Consent" filter option
- **`use-meeting-status-counts.ts`** — remove `pending_consent` counter
- **`add-bot-button.tsx`** — remove consent-related logic
- **`calendar-utils.ts`** — remove `pending_consent` from status types
- **`notification-icon.tsx`** — remove `bot_consent_request` case
- **`notification-item.tsx`** — remove `bot_consent_request` handling

### 6.4 New hooks

- **`use-subscribe-to-series.ts`** — wraps subscribe action with `useAction`
- **`use-unsubscribe-from-series.ts`** — wraps unsubscribe action with `useAction`
- **`use-series-subscriptions.ts`** — fetches active subscriptions for settings display

### 6.5 New data access

- **`bot-series-subscriptions.queries.ts`** — CRUD, `findAllActiveGroupedByUser()`, `findBySeriesId()`, `findByUserAndOrg()`

---

## 7. Server-side Cleanup

### 7.1 Files to delete

- `src/features/bot/actions/approve-bot-join.ts`
- `src/features/bot/actions/deny-bot-join.ts`
- `src/features/bot/hooks/use-bot-consent-notification.ts`
- `src/server/validation/bot/approve-bot-join.schema.ts`
- `src/server/validation/bot/deny-bot-join.schema.ts`
- `src/features/bot/components/bot-consent-notification.tsx`
- `src/features/bot/components/bot-consent-notification-actions.tsx`
- `src/features/bot/components/bot-consent-notification-content.tsx`
- `src/features/bot/lib/bot-notification-metadata.ts`
- `src/features/meetings/components/add-bot-consent-dialog.tsx`

### 7.2 Files to modify

- **`bot-settings.ts`** (schema) — remove `autoJoinEnabled`, `requirePerMeetingConsent`
- **`bot-sessions.ts`** (schema) — remove `"pending_consent"` from enum
- **`bot-settings.schema.ts`** (Zod) — remove fields
- **`bot-settings.queries.ts`** — remove fields from query results
- **`bot-settings.cache.ts`** — remove defaults for removed fields
- **`bot-calendar-monitor.service.ts`** — rewrite per Section 3
- **`bot-webhook.service.ts`** — remove `pending_consent` handling
- **`status-mapper.ts`** — remove `pending_consent` mappings; remap Recall.ai `"pending"` status to `"scheduled"` and `"bot.recording_permission_denied"` event to `"failed"`
- **`features/meetings/actions/add-bot-to-meeting.ts`** — remove consent flow
- **`cancel-bot-session.ts`** — remove `pending_consent` from cancellable statuses
- **`remove-bot-from-meeting.ts`** — remove `pending_consent` from cancellable statuses
- **`bot/sessions/page.tsx`** — remove `"pending_consent"` filter
- **`notifications.ts`** (schema) — keep `"bot_consent_request"` in enum for backward compat, but stop creating new ones
- **`notification.dto.ts`** — remove `bot_consent_request` comment/reference
- **`notifications/types.ts`** — remove `bot_consent_request` reference
- **`notification-item.tsx`** — remove `BotConsentNotification` import and rendering
- **`use-add-bot-to-meeting.ts`** — remove `consentGiven` from interface and `onConsentRequired` callback
- **`meeting-details-modal.tsx`** — remove `AddBotConsentDialog` import and usage
- **`notification-icon.tsx`** — remove `bot_consent_request` case

---

## 8. Error Handling

- If a calendar provider is disconnected when backfill runs, log a warning and skip that subscription
- If `getSeriesInstances()` fails for a specific series (e.g., series deleted), log error, skip, continue with next subscription
- If Recall.ai bot creation fails during backfill, log error with series context, continue with next instance
- Subscribe action: if backfill partially fails, still create the subscription — the daily cron will retry missing instances
- Unsubscribe action: if Recall.ai termination fails for some sessions, still deactivate the subscription and mark sessions as failed locally
