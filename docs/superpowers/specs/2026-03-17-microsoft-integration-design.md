# Microsoft Integration Design

**Date:** 2026-03-17
**Status:** Approved
**Scope:** Phase 1 — Outlook Calendar + Microsoft Teams. Phase 2 (future) — Outlook Mail + OneDrive.

## Overview

Add Microsoft Graph API integrations so Microsoft users can connect their Outlook Calendar and Microsoft Teams alongside the existing Google integrations. The architecture uses a Provider Strategy Pattern with shared OAuth base to keep providers isolated and extensible.

### Goals

- Microsoft users can connect Outlook Calendar (read/write) and create Teams meeting links
- Unified calendar monitoring creates bot sessions for both Google and Microsoft meetings
- Shared OAuth infrastructure avoids code duplication
- Architecture supports adding Mail and OneDrive in the future without structural changes

### Non-Goals

- Outlook Mail (email drafts) — designed for, not implemented
- OneDrive (file watches) — designed for, not implemented
- Replacing Better Auth sign-in — Microsoft sign-in already works via Better Auth; this covers the deeper Graph API connection

## Architecture: Provider Strategy Pattern

### Shared OAuth Base

Extract common OAuth logic from `GoogleOAuthService` into an abstract base class.

```
OAuthBaseService (abstract)
├── Encryption/decryption (AES-256-GCM)
├── Token CRUD on oauth_connections table
├── getValidAccessToken() — checks expiry (5-min buffer), calls refresh
├── hasScopes(), getConnectionStatus(), hasConnection()
├── Abstract: refreshAccessToken(refreshToken) — provider-specific
├── Abstract: revokeToken(token) — provider-specific
│
├── GoogleOAuthService extends OAuthBaseService
│   ├── refreshAccessToken() → Google token endpoint
│   ├── revokeToken() → Google revocation endpoint
│   └── exchangeCodeForTokens() → Google OAuth2 client
│
└── MicrosoftOAuthService extends OAuthBaseService
    ├── refreshAccessToken() → Microsoft /oauth2/v2.0/token
    ├── revokeToken() → deletes connection (Microsoft lacks programmatic revocation)
    └── exchangeCodeForTokens() → Microsoft identity platform
```

**File structure:**

```
src/server/services/
├── oauth/
│   └── oauth-base.service.ts           # Shared base class (new)
├── google-oauth.service.ts              # Refactored — extends base
└── microsoft-oauth.service.ts           # New — extends base
```

**Constraint:** Refactoring `GoogleOAuthService` must be a pure extraction — no behavior changes.

### Calendar Provider Interface

```typescript
interface CalendarProvider {
  listCalendars(userId: string): Promise<Calendar[]>;
  getUpcomingMeetings(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Meeting[]>;
  createEvent(userId: string, event: CreateEventInput): Promise<CalendarEvent>;
  updateEvent(
    userId: string,
    eventId: string,
    updates: UpdateEventInput,
  ): Promise<CalendarEvent>;
  getEvent(
    userId: string,
    calendarId: string,
    eventId: string,
  ): Promise<CalendarEvent>;
}
```

### Meeting Link Provider Interface

```typescript
interface MeetingLinkProvider {
  createOnlineMeeting(
    userId: string,
    options: MeetingOptions,
  ): Promise<MeetingLink>;
  extractMeetingUrl(event: CalendarEvent): string | null;
}
```

### Provider Implementations

| Operation           | Google                                       | Microsoft                                         |
| ------------------- | -------------------------------------------- | ------------------------------------------------- |
| List calendars      | `calendar.calendarList.list`                 | `GET /me/calendars`                               |
| Get events          | `calendar.events.list`                       | `GET /me/calendars/{id}/events`                   |
| Create event        | `calendar.events.insert`                     | `POST /me/calendars/{id}/events`                  |
| Update event        | `calendar.events.patch`                      | `PATCH /me/events/{id}`                           |
| Create meeting link | conferenceData in event body                 | `POST /me/onlineMeetings` (Teams)                 |
| Extract meeting URL | Regex on conferenceData/hangoutLink/location | Regex on `onlineMeeting` property + location/body |

**File structure:**

```
src/server/services/calendar/
├── calendar-provider.ts                 # Interface
├── meeting-link-provider.ts             # Interface
├── google-calendar.provider.ts          # Refactored from google-calendar.service.ts
├── google-meet.provider.ts              # Extracted from google-calendar.service.ts
├── microsoft-calendar.provider.ts       # New
├── microsoft-teams.provider.ts          # New
└── calendar-provider-factory.ts         # Resolves provider from user connection
```

### Provider Factory

```typescript
function getCalendarProvider(userId: string): Promise<CalendarProvider>;
function getMeetingLinkProvider(userId: string): Promise<MeetingLinkProvider>;
```

Consumer code (server actions, cron) calls the factory — never instantiates providers directly.

## Microsoft OAuth Flow

### Scope Tiers (Incremental Authorization)

| Tier            | Microsoft Graph Scopes                            | Unlocks                             |
| --------------- | ------------------------------------------------- | ----------------------------------- |
| `base`          | `User.Read`, `Calendars.Read`, `offline_access`   | Sign-in + read calendar             |
| `calendarWrite` | `Calendars.ReadWrite`, `OnlineMeetings.ReadWrite` | Create/edit events + Teams meetings |
| `mail`          | `Mail.ReadWrite`                                  | Create email drafts (future)        |
| `onedrive`      | `Files.Read.All`                                  | Watch folders (future)              |

Note: `offline_access` is required in base tier to obtain a refresh token.

### API Routes

- **POST** `/api/integrations/microsoft/authorize` — generates authorization URL with scope tier, state param, `prompt=consent`
- **GET** `/api/integrations/microsoft/callback` — exchanges code for tokens, encrypts, stores in `oauth_connections`

### Microsoft-Specific Differences from Google

- Uses `/oauth2/v2.0/authorize` and `/oauth2/v2.0/token` endpoints (tenant-aware: `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/...`)
- Scopes are space-separated strings, not URL-based
- Incremental consent requires passing all previously granted scopes + new ones (no `include_granted_scopes` equivalent)
- Token refresh requires sending `scope` parameter
- Tenant ID configurable via `MICROSOFT_TENANT_ID` env var (default: `"common"` for multi-tenant)

### Separation from Better Auth Sign-In

Sign-in with Microsoft (Better Auth) is separate from the Graph API connection. A user who signs in with Microsoft must still explicitly "Connect Microsoft" in settings to unlock Calendar/Teams features. Same pattern as Google.

### File Structure

```
src/features/integrations/microsoft/
├── lib/
│   ├── scope-constants.ts               # Scope tier definitions
│   ├── scope-utils.ts                   # Scope checking, merging helpers
│   └── microsoft-oauth.ts               # OAuth URL generation, code exchange
├── actions/
│   ├── connect.ts
│   ├── disconnect.ts
│   └── connection-status.ts
├── components/
│   ├── microsoft-connection.tsx
│   ├── microsoft-settings.tsx
│   └── microsoft-status-dashboard.tsx
└── hooks/
    └── use-microsoft-scope-check.ts

src/app/api/integrations/microsoft/
├── authorize/route.ts
└── callback/route.ts
```

## Unified Calendar Monitor

**Current:** `BotCalendarMonitorService` only handles Google.

**New behavior:**

1. Fetch all users with bot enabled (unchanged)
2. For each user, check which provider(s) they have in `oauth_connections`
3. Use `CalendarProvider` factory to get the right implementation
4. Fetch upcoming events using the provider interface
5. Use `MeetingLinkProvider` to extract meeting URLs (Meet or Teams)
6. Create bot sessions as before — Recall.ai supports both Google Meet and Teams

**Edge case:** User connected to both providers with overlapping events. Existing dedup by `meetingUrl` handles this — same Teams URL from both providers won't create duplicate bot sessions.

**No changes to cron route** — `/api/cron/monitor-calendar` stays as-is.

## Server Actions

Existing server actions (create calendar event, get meetings, update meeting details, create event with bot) are refactored to:

1. Determine user's connected provider from `oauth_connections`
2. Use factory to get the right `CalendarProvider` / `MeetingLinkProvider`
3. Call provider interface methods

Action signatures and return types stay the same — transparent to frontend.

### New Server Actions

- `connectMicrosoft` — initiates OAuth flow with scope tier
- `disconnectMicrosoft` — revokes and deletes connection
- `getMicrosoftConnectionStatus` — returns connection info

## UI Components

### New Components

| Component                        | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| `microsoft-connection.tsx`       | Connect/disconnect, show status         |
| `microsoft-settings.tsx`         | Configure automation rules for calendar |
| `microsoft-status-dashboard.tsx` | Show integration health                 |

### Modified Components

| Component                           | Change                                    |
| ----------------------------------- | ----------------------------------------- |
| `incremental-permission-dialog.tsx` | Add Microsoft scope tier descriptions     |
| `permission-explanation-dialog.tsx` | Add Microsoft permission explanations     |
| Settings page                       | Add Microsoft section alongside Google    |
| `create-event-dialog.tsx`           | Add provider selector when both connected |

### Provider Selector in Meeting Creation

When a user has both Google and Microsoft connected:

- Show provider selector (dropdown or tabs)
- Default to `preferredCalendarProvider` from `integration_settings`
- If no preference set, prompt user to choose

## Database Changes

### Existing Schema (No Changes)

- `oauth_connections` — `provider` enum already includes `"microsoft"`
- `auto_actions` — `provider` enum already includes `"microsoft"`
- `integration_settings` — provider-agnostic
- `integration_templates` — `provider` enum already includes `"microsoft"`
- `meetings` — `calendarEventId` and `meetingUrl` are provider-agnostic

### New Migration

**`XXXX_add_preferred_calendar_provider.ts`:**

- Add `preferredCalendarProvider` column to `integration_settings` (`"google" | "microsoft" | null`, default `null`)

### Bot Session Metadata Convention

Add `provider` field to the existing JSON `metadata` column in `bot_sessions` — not a schema change, just a convention.

## Environment Variables

### New Variables

| Variable                  | Required | Default                                         | Description                                     |
| ------------------------- | -------- | ----------------------------------------------- | ----------------------------------------------- |
| `MICROSOFT_CLIENT_ID`     | Yes      | —                                               | Azure App Registration client ID                |
| `MICROSOFT_CLIENT_SECRET` | Yes      | —                                               | Azure App Registration client secret            |
| `MICROSOFT_TENANT_ID`     | No       | `"common"`                                      | Azure AD tenant (common/organizations/specific) |
| `MICROSOFT_REDIRECT_URI`  | No       | `{APP_URL}/api/integrations/microsoft/callback` | OAuth callback URL                              |

### Documentation Updates

- Update `README.md` (root) environment variables section with Microsoft variables
- Update `infrastructure/TERRAFORM_VARIABLES.md` with deployment variables

## Future Extensibility (Phase 2)

### Mail Provider Interface (Planned)

```typescript
interface MailProvider {
  createDraft(userId: string, draft: CreateDraftInput): Promise<MailDraft>;
  getDraft(userId: string, draftId: string): Promise<MailDraft>;
  deleteDraft(userId: string, draftId: string): Promise<void>;
}
```

Google: `gmail.users.drafts.*` | Microsoft: `POST /me/messages` with `isDraft: true`

### File Watch Provider Interface (Planned)

```typescript
interface FileWatchProvider {
  startWatch(
    userId: string,
    folderId: string,
    projectId: string,
  ): Promise<WatchSubscription>;
  stopWatch(userId: string, watchId: string): Promise<void>;
  listFolderFiles(userId: string, folderId: string): Promise<FileMetadata[]>;
  downloadFile(userId: string, fileId: string): Promise<Buffer>;
}
```

Google: Drive Push Notifications | Microsoft: Graph API Subscriptions (max 3-day expiry for OneDrive)

### What Phase 1 Sets Up

- `OAuthBaseService` handles token management for any scope tier
- Scope tiers for `mail` and `onedrive` are defined but not exposed in UI
- Provider factory pattern makes adding implementations trivial
- `auto_actions` table already tracks `"microsoft"` provider

## Microsoft-Specific Technical Notes

### Teams Meeting Creation

Teams meeting creation is a separate API call (`POST /me/onlineMeetings`) — the join URL is then attached to the calendar event's `onlineMeeting` property. This differs from Google Meet which is embedded as conferenceData in the event creation request.

### Graph API Conventions

- Uses OData (`$select`, `$filter`, `$orderby`) for efficient queries
- Event categories (string-based) replace Google's numeric `colorId`
- Time zones use IANA format (same as Google) — no conversion needed

### Token Revocation

Microsoft does not support programmatic token revocation like Google. The `revokeToken()` implementation deletes the connection and clears stored tokens.

### Incremental Consent

Microsoft requires passing all previously granted scopes + new ones in each authorization request. The `MicrosoftOAuthService` must merge existing scopes with requested new scopes before redirecting.
