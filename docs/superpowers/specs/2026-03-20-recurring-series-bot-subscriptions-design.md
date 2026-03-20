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

| Column              | Type                                     | Notes                                                  |
| ------------------- | ---------------------------------------- | ------------------------------------------------------ |
| `id`                | uuid PK                                  | Default random                                         |
| `userId`            | text, not null                           | Better Auth user ID                                    |
| `organizationId`    | text, not null                           | Tenant isolation                                       |
| `recurringSeriesId` | text, not null                           | Google `recurringEventId` / Microsoft `seriesMasterId` |
| `calendarProvider`  | text ("google" \| "microsoft"), not null | Source calendar provider                               |
| `calendarId`        | text, not null                           | Which calendar the series lives on                     |
| `seriesTitle`       | text                                     | Denormalized for display                               |
| `meetingUrl`        | text                                     | Denormalized meeting URL                               |
| `active`            | boolean, default true                    | Soft toggle for pause/resume                           |
| `createdAt`         | timestamp with tz                        |                                                        |
| `updatedAt`         | timestamp with tz                        |                                                        |

**Unique constraint:** `(userId, organizationId, recurringSeriesId, calendarProvider)`
**Indexes:**

- `(userId, organizationId, active)` — calendar monitor lookups
- `(organizationId, recurringSeriesId)` — deduplication checks

### 1.2 Schema removals

**`bot_settings` table:**

- Drop `auto_join_enabled` column
- Drop `require_per_meeting_consent` column

**`bot_sessions` table:**

- Remove `"pending_consent"` from `botStatusEnum` → becomes `["scheduled", "joining", "active", "leaving", "completed", "failed"]`

### 1.3 Type additions

**`CalendarEvent` (shared type in `calendar/types.ts`):**

```typescript
recurringSeriesId?: string; // Google: recurringEventId, Microsoft: seriesMasterId
```

### 1.4 Migration

Single migration file that:

1. Creates `bot_series_subscriptions` table with constraints and indexes
2. Updates any existing `bot_sessions` rows with `bot_status = 'pending_consent'` to `'failed'`
3. Drops `auto_join_enabled` and `require_per_meeting_consent` columns from `bot_settings`

---

## 2. Calendar Provider Changes

### 2.1 Shared `CalendarEvent` type

Add `recurringSeriesId?: string` field.

### 2.2 Google Calendar Provider

- Map `recurringEventId` from `calendar_v3.Schema$Event` to `CalendarEvent.recurringSeriesId` in both `mapGoogleEventToCalendarEvent()` and `mapRawEventToCalendarEvent()`
- Add `getSeriesInstances()` method using Google's `events.instances(eventId, { timeMin, timeMax })` API

### 2.3 Microsoft Calendar Provider

- Map `seriesMasterId` from Microsoft Graph event to `CalendarEvent.recurringSeriesId`
- Add `getSeriesInstances()` method using Microsoft's `/events/{id}/instances?startDateTime=...&endDateTime=...` API

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
4. Create bot sessions only for matching instances, always as `"scheduled"`
5. Deduplication unchanged — by `calendarEventId` and `meetingUrl`

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
- Finds all bot sessions for the series with status `"scheduled"`
- Cancels them via `botProvider.terminateSession()` for any with a Recall bot
- Updates their status to `"failed"` or deletes them

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
- **`notification-icon.tsx` / `notification-item.tsx`** — remove `bot_consent_request` handling

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

### 7.2 Files to modify

- **`bot-settings.ts`** (schema) — remove `autoJoinEnabled`, `requirePerMeetingConsent`
- **`bot-sessions.ts`** (schema) — remove `"pending_consent"` from enum
- **`bot-settings.schema.ts`** (Zod) — remove fields
- **`bot-settings.queries.ts`** — remove fields from query results
- **`bot-settings.cache.ts`** — remove defaults for removed fields
- **`bot-calendar-monitor.service.ts`** — rewrite per Section 3
- **`bot-webhook.service.ts`** — remove `pending_consent` handling
- **`status-mapper.ts`** — remove `pending_consent` mappings
- **`add-bot-to-meeting.ts`** — remove consent flow
- **`cancel-bot-session.ts`** — remove `pending_consent` from cancellable statuses
- **`remove-bot-from-meeting.ts`** — remove `pending_consent` from cancellable statuses
- **`bot/sessions/page.tsx`** — remove `"pending_consent"` filter

---

## 8. Error Handling

- If a calendar provider is disconnected when backfill runs, log a warning and skip that subscription
- If `getSeriesInstances()` fails for a specific series (e.g., series deleted), log error, skip, continue with next subscription
- If Recall.ai bot creation fails during backfill, log error with series context, continue with next instance
- Subscribe action: if backfill partially fails, still create the subscription — the daily cron will retry missing instances
- Unsubscribe action: if Recall.ai termination fails for some sessions, still deactivate the subscription and mark sessions as failed locally
