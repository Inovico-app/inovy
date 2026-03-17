# Microsoft Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Microsoft Graph API integrations (Outlook Calendar + Teams) using a Provider Strategy Pattern with shared OAuth base, so Microsoft users can connect their calendar and Teams alongside Google.

**Architecture:** Extract shared `OAuthBaseService` from existing `GoogleOAuthService`. Define `CalendarProvider` and `MeetingLinkProvider` interfaces implemented by both Google and Microsoft. A factory resolves the right provider from the user's `oauth_connections`. The calendar monitor cron becomes provider-agnostic.

**Tech Stack:** Next.js 16, Microsoft Graph REST API, Better Auth, Drizzle ORM, neverthrow, next-safe-action, Tailwind CSS 4, Shadcn UI

**Spec:** `docs/superpowers/specs/2026-03-17-microsoft-integration-design.md`

---

## Task 1: Database Migrations

Prepare the schema for multi-provider support before any service code changes.

**Files:**

- Modify: `apps/web/src/server/db/schema/bot-sessions.ts:43`
- Modify: `apps/web/src/server/db/schema/bot-settings.ts:17-57`
- Modify: `apps/web/src/server/db/schema/onboardings.ts`
- Create: `apps/web/src/server/db/migrations/XXXX_microsoft_integration_prep.sql`

- [ ] **Step 1: Update bot_sessions schema — make meetingUrl nullable**

In `apps/web/src/server/db/schema/bot-sessions.ts`, change line 43:

```typescript
// Before:
meetingUrl: text("meeting_url").notNull(),
// After:
meetingUrl: text("meeting_url"),
```

Also update the `calendarEventId` comment on line 45:

```typescript
// Before:
calendarEventId: text("calendar_event_id"), // Google Calendar event ID for deduplication
// After:
calendarEventId: text("calendar_event_id"), // Calendar event ID (Google or Microsoft) for deduplication
```

- [ ] **Step 2: Add preferredCalendarProvider to bot_settings schema**

In `apps/web/src/server/db/schema/bot-settings.ts`, add after the `calendarIds` field:

```typescript
preferredCalendarProvider: text("preferred_calendar_provider", {
  enum: ["google", "microsoft"],
}),
```

- [ ] **Step 3: Add microsoftCalendarConnectedDuringOnboarding to onboardings schema**

In `apps/web/src/server/db/schema/onboardings.ts`, add alongside the existing `googleConnectedDuringOnboarding` field:

```typescript
microsoftCalendarConnectedDuringOnboarding: boolean("microsoft_connected_during_onboarding").default(false).notNull(),
```

- [ ] **Step 4: Generate migration**

Run: `cd apps/web && pnpm db:generate --name microsoft-integration-prep`

- [ ] **Step 5: Verify typecheck passes**

Run: `cd apps/web && pnpm run typecheck`
Expected: Clean pass

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/server/db/schema/bot-sessions.ts apps/web/src/server/db/schema/bot-settings.ts apps/web/src/server/db/schema/onboardings.ts apps/web/src/server/db/migrations/
git commit -m "feat(db): add migrations for Microsoft integration prep

- Make bot_sessions.meetingUrl nullable for non-online events
- Add preferredCalendarProvider to bot_settings
- Add microsoftCalendarConnectedDuringOnboarding to onboardings"
```

---

## Task 2: Extract Shared OAuth Base Service

Extract encryption, token CRUD, and shared logic from `GoogleOAuthService` into `OAuthBaseService`. This is a pure refactor — no behavior changes.

**Files:**

- Create: `apps/web/src/server/services/oauth/oauth-base.service.ts`
- Modify: `apps/web/src/server/services/google-oauth.service.ts`
- Modify: `apps/web/src/features/integrations/google/lib/google-oauth.ts`

- [ ] **Step 1: Create OAuthBaseService with encryption utilities**

Create `apps/web/src/server/services/oauth/oauth-base.service.ts`:

```typescript
import crypto from "crypto";

import { err, ok } from "neverthrow";

import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { OAuthConnectionsQueries } from "@/server/data-access/oauth-connections.queries";
import type {
  OAuthConnection,
  NewOAuthConnection,
} from "@/server/db/schema/oauth-connections";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export abstract class OAuthBaseService {
  protected abstract readonly provider: "google" | "microsoft";

  // --- Encryption ---

  static encryptToken(token: string): string {
    const keyHex = process.env.OAUTH_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== KEY_LENGTH * 2) {
      throw new Error("OAUTH_ENCRYPTION_KEY must be a 64-character hex string");
    }
    const key = Buffer.from(keyHex, "hex");
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  static decryptToken(encryptedToken: string): string {
    const keyHex = process.env.OAUTH_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== KEY_LENGTH * 2) {
      throw new Error("OAUTH_ENCRYPTION_KEY must be a 64-character hex string");
    }
    const key = Buffer.from(keyHex, "hex");
    const parts = encryptedToken.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted token format");
    }
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex!, "hex");
    const authTag = Buffer.from(authTagHex!, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted!, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  // --- Token CRUD ---

  async getConnection(
    userId: string,
  ): Promise<ActionResult<OAuthConnection | null>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        this.provider,
      );
      return ok(connection);
    } catch (error) {
      logger.error(`Failed to get ${this.provider} OAuth connection`, {
        error,
        userId,
      });
      return err(
        ActionErrors.internalError(`Failed to get ${this.provider} connection`),
      );
    }
  }

  async getValidAccessToken(userId: string): Promise<ActionResult<string>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        this.provider,
      );
      if (!connection) {
        return err(
          ActionErrors.notFound(`No ${this.provider} connection found`),
        );
      }

      const FIVE_MINUTES = 5 * 60 * 1000;
      const isExpired =
        connection.expiresAt &&
        new Date(connection.expiresAt).getTime() - Date.now() < FIVE_MINUTES;

      if (!isExpired && connection.accessToken) {
        return ok(OAuthBaseService.decryptToken(connection.accessToken));
      }

      if (!connection.refreshToken) {
        return err(
          ActionErrors.unauthorized(`No refresh token for ${this.provider}`),
        );
      }

      const refreshResult = await this.refreshAccessToken(connection);
      if (refreshResult.isErr()) return err(refreshResult.error);

      const { accessToken, expiresAt } = refreshResult.value;
      const encryptedAccessToken = OAuthBaseService.encryptToken(accessToken);

      await OAuthConnectionsQueries.updateOAuthConnection(
        userId,
        this.provider,
        {
          accessToken: encryptedAccessToken,
          expiresAt,
        },
      );

      return ok(accessToken);
    } catch (error) {
      logger.error(`Failed to get valid ${this.provider} access token`, {
        error,
        userId,
      });
      return err(
        ActionErrors.internalError(
          `Failed to get ${this.provider} access token`,
        ),
      );
    }
  }

  async disconnect(userId: string): Promise<ActionResult<boolean>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        this.provider,
      );
      if (connection?.accessToken) {
        try {
          const token = OAuthBaseService.decryptToken(connection.accessToken);
          await this.revokeToken(token);
        } catch (revokeError) {
          logger.warn(`Failed to revoke ${this.provider} token`, {
            revokeError,
            userId,
          });
        }
      }
      await OAuthConnectionsQueries.deleteOAuthConnection(
        userId,
        this.provider,
      );
      return ok(true);
    } catch (error) {
      logger.error(`Failed to disconnect ${this.provider}`, { error, userId });
      return err(
        ActionErrors.internalError(`Failed to disconnect ${this.provider}`),
      );
    }
  }

  async hasConnection(userId: string): Promise<ActionResult<boolean>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        this.provider,
      );
      return ok(!!connection);
    } catch (error) {
      logger.error(`Failed to check ${this.provider} connection`, {
        error,
        userId,
      });
      return err(
        ActionErrors.internalError(
          `Failed to check ${this.provider} connection`,
        ),
      );
    }
  }

  async getConnectionStatus(userId: string): Promise<
    ActionResult<{
      connected: boolean;
      email?: string;
      scopes?: string[];
      expiresAt?: Date;
    }>
  > {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        this.provider,
      );
      if (!connection) {
        return ok({ connected: false });
      }
      return ok({
        connected: true,
        email: connection.email ?? undefined,
        scopes: connection.scopes ?? undefined,
        expiresAt: connection.expiresAt ?? undefined,
      });
    } catch (error) {
      logger.error(`Failed to get ${this.provider} connection status`, {
        error,
        userId,
      });
      return err(
        ActionErrors.internalError(
          `Failed to get ${this.provider} connection status`,
        ),
      );
    }
  }

  // --- Abstract methods (provider-specific) ---

  protected abstract refreshAccessToken(
    connection: OAuthConnection,
  ): Promise<ActionResult<{ accessToken: string; expiresAt: Date }>>;

  protected abstract revokeToken(token: string): Promise<void>;
}
```

- [ ] **Step 2: Refactor GoogleOAuthService to extend OAuthBaseService**

In `apps/web/src/server/services/google-oauth.service.ts`, refactor to extend the base:

```typescript
import { err, ok } from "neverthrow";

import {
  exchangeCodeForTokens,
  getUserEmail,
  refreshAccessToken as googleRefreshToken,
  revokeToken as googleRevokeToken,
} from "@/features/integrations/google/lib/google-oauth";
import { hasRequiredScopes } from "@/features/integrations/google/lib/scope-utils";
import type { ScopeTier } from "@/features/integrations/google/lib/scope-constants";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { OAuthConnectionsQueries } from "@/server/data-access/oauth-connections.queries";
import type { OAuthConnection } from "@/server/db/schema/oauth-connections";

import { OAuthBaseService } from "./oauth/oauth-base.service";

export class GoogleOAuthService extends OAuthBaseService {
  protected readonly provider = "google" as const;

  private static instance = new GoogleOAuthService();

  // Static methods delegate to instance for backward compatibility
  static async storeConnection(
    userId: string,
    code: string,
    redirectUri?: string,
  ): Promise<ActionResult<OAuthConnection>> {
    return GoogleOAuthService.instance._storeConnection(
      userId,
      code,
      redirectUri,
    );
  }

  static async getConnection(userId: string) {
    return GoogleOAuthService.instance.getConnection(userId);
  }

  static async getValidAccessToken(userId: string) {
    return GoogleOAuthService.instance.getValidAccessToken(userId);
  }

  static async disconnect(userId: string) {
    return GoogleOAuthService.instance.disconnect(userId);
  }

  static async hasConnection(userId: string) {
    return GoogleOAuthService.instance.hasConnection(userId);
  }

  static async getConnectionStatus(userId: string) {
    return GoogleOAuthService.instance.getConnectionStatus(userId);
  }

  static async hasScopes(
    userId: string,
    tier: ScopeTier,
  ): Promise<ActionResult<boolean>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "google",
      );
      if (!connection || !connection.scopes) {
        return ok(false);
      }
      return ok(hasRequiredScopes(connection.scopes, tier));
    } catch (error) {
      logger.error("Failed to check Google scopes", { error, userId });
      return err(ActionErrors.internalError("Failed to check Google scopes"));
    }
  }

  // Provider-specific implementations

  protected async refreshAccessToken(
    connection: OAuthConnection,
  ): Promise<ActionResult<{ accessToken: string; expiresAt: Date }>> {
    try {
      const refreshToken = OAuthBaseService.decryptToken(
        connection.refreshToken!,
      );
      const result = await googleRefreshToken(refreshToken);
      return ok({
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      logger.error("Failed to refresh Google token", { error });
      return err(ActionErrors.internalError("Failed to refresh Google token"));
    }
  }

  protected async revokeToken(token: string): Promise<void> {
    await googleRevokeToken(token);
  }

  // Google-specific methods

  private async _storeConnection(
    userId: string,
    code: string,
    redirectUri?: string,
  ): Promise<ActionResult<OAuthConnection>> {
    // Keep the existing storeConnection logic from the current GoogleOAuthService
    // (exchange code, get email, encrypt tokens, upsert connection)
    // This is a direct copy of the existing implementation
    try {
      const tokens = await exchangeCodeForTokens(code, redirectUri);
      const email = await getUserEmail(tokens.accessToken);

      const encryptedAccessToken = OAuthBaseService.encryptToken(
        tokens.accessToken,
      );
      const encryptedRefreshToken = tokens.refreshToken
        ? OAuthBaseService.encryptToken(tokens.refreshToken)
        : undefined;

      const existing = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "google",
      );

      if (existing) {
        const mergedScopes = [
          ...new Set([...(existing.scopes ?? []), ...(tokens.scopes ?? [])]),
        ];
        const updated = await OAuthConnectionsQueries.updateOAuthConnection(
          userId,
          "google",
          {
            accessToken: encryptedAccessToken,
            ...(encryptedRefreshToken && {
              refreshToken: encryptedRefreshToken,
            }),
            expiresAt: tokens.expiresAt,
            scopes: mergedScopes,
            email,
          },
        );
        if (!updated) {
          return err(
            ActionErrors.internalError("Failed to update Google connection"),
          );
        }
        return ok(updated);
      }

      const connection = await OAuthConnectionsQueries.createOAuthConnection({
        userId,
        provider: "google",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken ?? "",
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes ?? [],
        email,
      });
      return ok(connection);
    } catch (error) {
      logger.error("Failed to store Google connection", { error, userId });
      return err(
        ActionErrors.internalError("Failed to store Google connection"),
      );
    }
  }
}
```

- [ ] **Step 3: Remove encryption functions from google-oauth.ts and re-export from base**

In `apps/web/src/features/integrations/google/lib/google-oauth.ts`:

- Remove `encryptToken` and `decryptToken` function definitions
- Remove encryption constants (`ALGORITHM`, `KEY_LENGTH`, `IV_LENGTH`, `AUTH_TAG_LENGTH`)
- Add re-exports:

```typescript
export { OAuthBaseService } from "@/server/services/oauth/oauth-base.service";
// Re-export encryption for backward compat
export const encryptToken = OAuthBaseService.encryptToken;
export const decryptToken = OAuthBaseService.decryptToken;
```

- [ ] **Step 4: Verify typecheck passes**

Run: `cd apps/web && pnpm run typecheck`
Expected: Clean pass — all existing imports of `encryptToken`/`decryptToken` from `google-oauth.ts` still work via re-exports.

- [ ] **Step 5: Verify lint passes**

Run: `cd apps/web && pnpm lint`
Expected: No new warnings/errors introduced.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/server/services/oauth/ apps/web/src/server/services/google-oauth.service.ts apps/web/src/features/integrations/google/lib/google-oauth.ts
git commit -m "refactor(oauth): extract OAuthBaseService from GoogleOAuthService

Pure extraction — no behavior changes. Encryption, token CRUD, and
shared logic moved to abstract base. GoogleOAuthService extends base
and maintains backward-compatible static API."
```

---

## Task 3: Microsoft OAuth Library

Create the Microsoft-specific OAuth helpers: scope constants, scope utilities, and OAuth URL/token exchange functions.

**Files:**

- Create: `apps/web/src/features/integrations/microsoft/lib/scope-constants.ts`
- Create: `apps/web/src/features/integrations/microsoft/lib/scope-utils.ts`
- Create: `apps/web/src/features/integrations/microsoft/lib/microsoft-oauth.ts`

- [ ] **Step 1: Create Microsoft scope constants**

Create `apps/web/src/features/integrations/microsoft/lib/scope-constants.ts`:

```typescript
export const MS_SCOPE_TIERS = {
  base: ["User.Read", "Calendars.Read", "offline_access"],
  calendarWrite: ["Calendars.ReadWrite", "OnlineMeetings.ReadWrite"],
  mail: ["Mail.ReadWrite"],
  onedrive: ["Files.Read.All"],
} as const;

export type MsScopeTier = keyof typeof MS_SCOPE_TIERS;
export type MsScope = (typeof MS_SCOPE_TIERS)[MsScopeTier][number];
```

- [ ] **Step 2: Create Microsoft scope utilities**

Create `apps/web/src/features/integrations/microsoft/lib/scope-utils.ts`:

```typescript
import { MS_SCOPE_TIERS, type MsScopeTier } from "./scope-constants";

export function hasRequiredMsScopes(
  userScopes: string[],
  tier: MsScopeTier,
): boolean {
  const required = MS_SCOPE_TIERS[tier];
  return required.every((scope) => userScopes.includes(scope));
}

export function getMissingMsScopes(
  userScopes: string[],
  tier: MsScopeTier,
): string[] {
  const required = MS_SCOPE_TIERS[tier];
  return required.filter((scope) => !userScopes.includes(scope));
}

export function mergeWithExistingScopes(
  existingScopes: string[],
  tier: MsScopeTier,
): string[] {
  const tierScopes = MS_SCOPE_TIERS[tier];
  return [...new Set([...existingScopes, ...tierScopes])];
}

export function getIncrementalAuthUrl(
  tier: MsScopeTier,
  redirectUrl: string,
): string {
  const params = new URLSearchParams({
    tier,
    redirect: redirectUrl,
  });
  return `/api/integrations/microsoft/authorize?${params.toString()}`;
}

const TIER_LABELS: Record<MsScopeTier, string> = {
  base: "Calendar (read-only)",
  calendarWrite: "Calendar (create & edit events) + Teams meetings",
  mail: "Outlook Mail (create drafts)",
  onedrive: "OneDrive (read files)",
};

const TIER_DESCRIPTIONS: Record<MsScopeTier, string> = {
  base: "View your Outlook calendars and upcoming events",
  calendarWrite:
    "Create and edit calendar events, and create Teams meeting links",
  mail: "Create email drafts from meeting summaries",
  onedrive: "Watch OneDrive folders for audio/video recordings",
};

export function msTierToLabel(tier: MsScopeTier): string {
  return TIER_LABELS[tier];
}

export function msTierToDescription(tier: MsScopeTier): string {
  return TIER_DESCRIPTIONS[tier];
}
```

- [ ] **Step 3: Create Microsoft OAuth helpers**

Create `apps/web/src/features/integrations/microsoft/lib/microsoft-oauth.ts`:

```typescript
import { logger } from "@/lib/logger";

import { MS_SCOPE_TIERS, type MsScopeTier } from "./scope-constants";
import { mergeWithExistingScopes } from "./scope-utils";

function getTenantId(): string {
  return process.env.MICROSOFT_TENANT_ID ?? "common";
}

function getClientId(): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error("MICROSOFT_CLIENT_ID is not set");
  return clientId;
}

function getClientSecret(): string {
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!secret) throw new Error("MICROSOFT_CLIENT_SECRET is not set");
  return secret;
}

export function getMicrosoftRedirectUri(requestUrl?: string): string {
  if (process.env.MICROSOFT_REDIRECT_URI) {
    return process.env.MICROSOFT_REDIRECT_URI;
  }
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (requestUrl ? new URL(requestUrl).origin : "http://localhost:3000");
  return `${appUrl}/api/integrations/microsoft/callback`;
}

export function getAuthorizationUrl(options: {
  scopes: string[];
  state: string;
  redirectUri: string;
}): string {
  const tenantId = getTenantId();
  const clientId = getClientId();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: options.redirectUri,
    scope: options.scopes.join(" "),
    state: options.state,
    response_mode: "query",
    prompt: "consent",
  });
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scopes: string[];
}> {
  const tenantId = getTenantId();
  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: getClientId(),
        client_secret: getClientSecret(),
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error("Microsoft token exchange failed", {
      status: response.status,
      errorBody,
    });
    throw new Error(`Microsoft token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  const scopes = data.scope ? data.scope.split(" ") : [];

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
    scopes,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  existingScopes: string[],
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
}> {
  const tenantId = getTenantId();
  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: getClientId(),
        client_secret: getClientSecret(),
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: existingScopes.join(" "),
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error("Microsoft token refresh failed", {
      status: response.status,
      errorBody,
    });
    throw new Error(`Microsoft token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
  };
}

export async function getUserEmail(accessToken: string): Promise<string> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Microsoft user info: ${response.status}`);
  }

  const data = await response.json();
  return data.mail ?? data.userPrincipalName ?? "";
}

export function resolveScopeTiers(
  tierParam: string | null,
  existingScopes: string[],
): string[] {
  const tier = (tierParam ?? "base") as MsScopeTier;
  if (!MS_SCOPE_TIERS[tier]) {
    return mergeWithExistingScopes(existingScopes, "base");
  }
  return mergeWithExistingScopes(existingScopes, tier);
}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `cd apps/web && pnpm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/integrations/microsoft/
git commit -m "feat(microsoft): add OAuth library — scope constants, utils, and token exchange

Defines Microsoft Graph scope tiers (base, calendarWrite, mail, onedrive),
scope merging utilities, and OAuth 2.0 helpers for authorization URL
generation, code exchange, and token refresh."
```

---

## Task 4: Microsoft OAuth Service

Create `MicrosoftOAuthService` extending `OAuthBaseService`.

**Files:**

- Create: `apps/web/src/server/services/microsoft-oauth.service.ts`

- [ ] **Step 1: Create MicrosoftOAuthService**

Create `apps/web/src/server/services/microsoft-oauth.service.ts`:

```typescript
import { err, ok } from "neverthrow";

import {
  exchangeCodeForTokens,
  getUserEmail,
  refreshAccessToken as msRefreshToken,
} from "@/features/integrations/microsoft/lib/microsoft-oauth";
import { hasRequiredMsScopes } from "@/features/integrations/microsoft/lib/scope-utils";
import type { MsScopeTier } from "@/features/integrations/microsoft/lib/scope-constants";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { OAuthConnectionsQueries } from "@/server/data-access/oauth-connections.queries";
import type { OAuthConnection } from "@/server/db/schema/oauth-connections";

import { OAuthBaseService } from "./oauth/oauth-base.service";

export class MicrosoftOAuthService extends OAuthBaseService {
  protected readonly provider = "microsoft" as const;

  private static instance = new MicrosoftOAuthService();

  static async storeConnection(
    userId: string,
    code: string,
    redirectUri: string,
  ): Promise<ActionResult<OAuthConnection>> {
    return MicrosoftOAuthService.instance._storeConnection(
      userId,
      code,
      redirectUri,
    );
  }

  static async getConnection(userId: string) {
    return MicrosoftOAuthService.instance.getConnection(userId);
  }

  static async getValidAccessToken(userId: string) {
    return MicrosoftOAuthService.instance.getValidAccessToken(userId);
  }

  static async disconnect(userId: string) {
    return MicrosoftOAuthService.instance.disconnect(userId);
  }

  static async hasConnection(userId: string) {
    return MicrosoftOAuthService.instance.hasConnection(userId);
  }

  static async getConnectionStatus(userId: string) {
    return MicrosoftOAuthService.instance.getConnectionStatus(userId);
  }

  static async hasScopes(
    userId: string,
    tier: MsScopeTier,
  ): Promise<ActionResult<boolean>> {
    try {
      const connection = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "microsoft",
      );
      if (!connection || !connection.scopes) {
        return ok(false);
      }
      return ok(hasRequiredMsScopes(connection.scopes, tier));
    } catch (error) {
      logger.error("Failed to check Microsoft scopes", { error, userId });
      return err(
        ActionErrors.internalError("Failed to check Microsoft scopes"),
      );
    }
  }

  protected async refreshAccessToken(
    connection: OAuthConnection,
  ): Promise<ActionResult<{ accessToken: string; expiresAt: Date }>> {
    try {
      const refreshToken = OAuthBaseService.decryptToken(
        connection.refreshToken!,
      );
      const scopes = connection.scopes ?? [];
      const result = await msRefreshToken(refreshToken, scopes);

      // Microsoft may return a new refresh token — persist it
      if (result.refreshToken) {
        const encryptedRefresh = OAuthBaseService.encryptToken(
          result.refreshToken,
        );
        await OAuthConnectionsQueries.updateOAuthConnection(
          connection.userId,
          "microsoft",
          { refreshToken: encryptedRefresh },
        );
      }

      return ok({
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      logger.error("Failed to refresh Microsoft token", { error });
      return err(
        ActionErrors.internalError("Failed to refresh Microsoft token"),
      );
    }
  }

  protected async revokeToken(_token: string): Promise<void> {
    // Microsoft does not support programmatic token revocation.
    // Connection cleanup (DB delete) is handled by OAuthBaseService.disconnect()
    logger.info(
      "Microsoft token revocation is a no-op — connection will be deleted",
    );
  }

  private async _storeConnection(
    userId: string,
    code: string,
    redirectUri: string,
  ): Promise<ActionResult<OAuthConnection>> {
    try {
      const tokens = await exchangeCodeForTokens(code, redirectUri);
      const email = await getUserEmail(tokens.accessToken);

      const encryptedAccessToken = OAuthBaseService.encryptToken(
        tokens.accessToken,
      );
      const encryptedRefreshToken = tokens.refreshToken
        ? OAuthBaseService.encryptToken(tokens.refreshToken)
        : "";

      const existing = await OAuthConnectionsQueries.getOAuthConnection(
        userId,
        "microsoft",
      );

      if (existing) {
        const mergedScopes = [
          ...new Set([...(existing.scopes ?? []), ...(tokens.scopes ?? [])]),
        ];
        const updated = await OAuthConnectionsQueries.updateOAuthConnection(
          userId,
          "microsoft",
          {
            accessToken: encryptedAccessToken,
            ...(encryptedRefreshToken && {
              refreshToken: encryptedRefreshToken,
            }),
            expiresAt: tokens.expiresAt,
            scopes: mergedScopes,
            email,
          },
        );
        if (!updated) {
          return err(
            ActionErrors.internalError("Failed to update Microsoft connection"),
          );
        }
        return ok(updated);
      }

      const connection = await OAuthConnectionsQueries.createOAuthConnection({
        userId,
        provider: "microsoft",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes ?? [],
        email,
      });
      return ok(connection);
    } catch (error) {
      logger.error("Failed to store Microsoft connection", { error, userId });
      return err(
        ActionErrors.internalError("Failed to store Microsoft connection"),
      );
    }
  }
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd apps/web && pnpm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/server/services/microsoft-oauth.service.ts
git commit -m "feat(microsoft): add MicrosoftOAuthService extending OAuthBaseService

Implements Microsoft-specific token refresh (with scope param),
no-op token revocation, and token exchange via Microsoft identity
platform. Follows same static API pattern as GoogleOAuthService."
```

---

## Task 5: Microsoft OAuth API Routes

Create authorize and callback routes for the Microsoft OAuth flow.

**Files:**

- Create: `apps/web/src/app/api/integrations/microsoft/authorize/route.ts`
- Create: `apps/web/src/app/api/integrations/microsoft/callback/route.ts`

- [ ] **Step 1: Create authorize route**

Create `apps/web/src/app/api/integrations/microsoft/authorize/route.ts`. Follow the exact pattern from the Google authorize route (`apps/web/src/app/api/integrations/google/authorize/route.ts`) but use Microsoft OAuth helpers:

- Read user's existing scopes from `oauth_connections` for Microsoft
- Merge with requested tier scopes via `resolveScopeTiers()`
- Build state as `base64({ userId, timestamp: Date.now(), redirectUrl })`
- Return redirect to `getAuthorizationUrl({ scopes, state, redirectUri })`
- Same `validateRedirectUrl` pattern for same-origin check

- [ ] **Step 2: Create callback route**

Create `apps/web/src/app/api/integrations/microsoft/callback/route.ts`. Follow the exact pattern from the Google callback route (`apps/web/src/app/api/integrations/google/callback/route.ts`) but:

- Validate CSRF state (userId match, 10-minute expiry)
- Call `MicrosoftOAuthService.storeConnection(userId, code, redirectUri)`
- Call `CacheInvalidation.invalidateMicrosoftConnection(userId)` (created in Task 8)
- Handle onboarding: update `microsoftCalendarConnectedDuringOnboarding` flag
- Redirect to `state.redirectUrl` or `/settings?microsoft_success=true`

- [ ] **Step 3: Verify typecheck passes**

Run: `cd apps/web && pnpm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/integrations/microsoft/
git commit -m "feat(microsoft): add OAuth authorize and callback API routes

Same CSRF state protection as Google (userId + 10-min expiry).
Authorize route merges existing scopes with requested tier.
Callback stores connection and invalidates cache."
```

---

## Task 6: Calendar Provider Interfaces and Shared Types

Define the `CalendarProvider` and `MeetingLinkProvider` interfaces with shared types.

**Files:**

- Create: `apps/web/src/server/services/calendar/calendar-provider.ts`
- Create: `apps/web/src/server/services/calendar/meeting-link-provider.ts`
- Create: `apps/web/src/server/services/calendar/types.ts`

- [ ] **Step 1: Create shared types**

Create `apps/web/src/server/services/calendar/types.ts`:

```typescript
export interface Calendar {
  id: string;
  name: string;
  accessRole?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  meetingUrl: string | null;
  attendees?: Array<{ email: string; responseStatus: string }>;
  organizer?: { email: string };
  isOrganizer?: boolean;
  calendarId: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  calendarId?: string;
  attendees?: string[];
  addOnlineMeeting?: boolean;
  recurrence?: unknown;
  timeZone?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  location?: string;
  addOnlineMeeting?: boolean;
}

export interface MeetingOptions {
  subject: string;
  startDateTime: Date;
  endDateTime: Date;
}

export interface MeetingLink {
  joinUrl: string;
  meetingId?: string;
}

export interface GetUpcomingMeetingsOptions {
  timeMin: Date;
  timeMax: Date;
  calendarIds?: string[];
}
```

- [ ] **Step 2: Create CalendarProvider interface**

Create `apps/web/src/server/services/calendar/calendar-provider.ts`:

```typescript
import type { ActionResult } from "@/lib/server-action-client/action-errors";

import type {
  Calendar,
  CalendarEvent,
  CreateEventInput,
  GetUpcomingMeetingsOptions,
  UpdateEventInput,
} from "./types";

export interface CalendarProvider {
  listCalendars(userId: string): Promise<ActionResult<Calendar[]>>;

  getUpcomingMeetings(
    userId: string,
    options: GetUpcomingMeetingsOptions,
  ): Promise<ActionResult<CalendarEvent[]>>;

  createEvent(
    userId: string,
    event: CreateEventInput,
  ): Promise<
    ActionResult<{
      eventId: string;
      eventUrl: string;
      meetingUrl: string | null;
    }>
  >;

  updateEvent(
    userId: string,
    eventId: string,
    updates: UpdateEventInput,
  ): Promise<ActionResult<{ eventUrl: string; meetingUrl: string | null }>>;

  getEvent(
    userId: string,
    calendarId: string,
    eventId: string,
  ): Promise<ActionResult<CalendarEvent>>;
}
```

- [ ] **Step 3: Create MeetingLinkProvider interface**

Create `apps/web/src/server/services/calendar/meeting-link-provider.ts`:

```typescript
import type { ActionResult } from "@/lib/server-action-client/action-errors";

import type { CalendarEvent, MeetingLink, MeetingOptions } from "./types";

export interface MeetingLinkProvider {
  createOnlineMeeting(
    userId: string,
    options: MeetingOptions,
  ): Promise<ActionResult<MeetingLink>>;

  extractMeetingUrl(event: CalendarEvent): string | null;
}
```

- [ ] **Step 4: Verify typecheck**

Run: `cd apps/web && pnpm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/services/calendar/
git commit -m "feat(calendar): add CalendarProvider and MeetingLinkProvider interfaces

Shared types and interfaces for provider-agnostic calendar operations.
CalendarEvent.meetingUrl is string | null for non-online events."
```

---

## Task 7: Google Calendar and Meet Providers

Refactor `GoogleCalendarService` to implement `CalendarProvider`. Extract Meet URL logic into `GoogleMeetProvider` implementing `MeetingLinkProvider`.

**Files:**

- Create: `apps/web/src/server/services/calendar/google-calendar.provider.ts`
- Create: `apps/web/src/server/services/calendar/google-meet.provider.ts`
- Modify: `apps/web/src/server/services/google-calendar.service.ts` (keep as-is for backward compat, new provider wraps it)

- [ ] **Step 1: Create GoogleCalendarProvider**

Create `apps/web/src/server/services/calendar/google-calendar.provider.ts` that wraps the existing `GoogleCalendarService` and maps to the `CalendarProvider` interface. Delegate to the existing service methods — don't rewrite them. Map the existing `CalendarEvent` type to the shared interface type (making `meetingUrl` nullable).

- [ ] **Step 2: Create GoogleMeetProvider**

Create `apps/web/src/server/services/calendar/google-meet.provider.ts` that implements `MeetingLinkProvider`. Extract `extractMeetingUrl` from `GoogleCalendarService` (the `extractMeetUrl` helper). For `createOnlineMeeting`, delegate to the existing event creation with conferenceData.

- [ ] **Step 3: Verify typecheck**

Run: `cd apps/web && pnpm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/server/services/calendar/google-calendar.provider.ts apps/web/src/server/services/calendar/google-meet.provider.ts
git commit -m "feat(calendar): add Google calendar and Meet providers

Wraps existing GoogleCalendarService behind CalendarProvider interface.
Extracts Meet URL logic into GoogleMeetProvider for MeetingLinkProvider."
```

---

## Task 8: Microsoft Calendar and Teams Providers + Cache Invalidation

Implement `MicrosoftCalendarProvider` and `MicrosoftTeamsProvider` using Microsoft Graph API. Also add Microsoft cache invalidation.

**Files:**

- Create: `apps/web/src/server/services/calendar/microsoft-calendar.provider.ts`
- Create: `apps/web/src/server/services/calendar/microsoft-teams.provider.ts`
- Modify: `apps/web/src/lib/cache-utils.ts`

- [ ] **Step 1: Create MicrosoftCalendarProvider**

Create `apps/web/src/server/services/calendar/microsoft-calendar.provider.ts` implementing `CalendarProvider`:

- `listCalendars` → `GET https://graph.microsoft.com/v1.0/me/calendars`
- `getUpcomingMeetings` → `GET /me/calendarView?startDateTime=...&endDateTime=...` with `$select` and optional `$filter` for calendarIds
- `createEvent` → `POST /me/calendars/{calendarId}/events`
- `updateEvent` → `PATCH /me/events/{eventId}`
- `getEvent` → `GET /me/calendars/{calendarId}/events/{eventId}`

Each method: get access token via `MicrosoftOAuthService.getValidAccessToken()`, make Graph API call, map response to shared types.

**Important:** Read the Microsoft Graph API docs for calendar operations before implementing. Use the context7 MCP tool:

```
resolve-library-id: "microsoft-graph"
query-docs: "calendar events create list update"
```

- [ ] **Step 2: Create MicrosoftTeamsProvider**

Create `apps/web/src/server/services/calendar/microsoft-teams.provider.ts` implementing `MeetingLinkProvider`:

- `createOnlineMeeting` → `POST https://graph.microsoft.com/v1.0/me/onlineMeetings` with `{ subject, startDateTime, endDateTime }`
- `extractMeetingUrl` → Check `event.meetingUrl` first, then regex on event body/location for Teams URLs (`https://teams.microsoft.com/l/meetup-join/...`)

- [ ] **Step 3: Add Microsoft cache invalidation**

In `apps/web/src/lib/cache-utils.ts`:

- Add `microsoftConnection: (userId: string) => \`microsoft-connection-${userId}\``to`CacheTags`
- Add `invalidateMicrosoftConnection(userId: string)` to `CacheInvalidation` following the Google pattern

- [ ] **Step 4: Verify typecheck**

Run: `cd apps/web && pnpm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/services/calendar/microsoft-calendar.provider.ts apps/web/src/server/services/calendar/microsoft-teams.provider.ts apps/web/src/lib/cache-utils.ts
git commit -m "feat(microsoft): add Calendar and Teams providers via Graph API

MicrosoftCalendarProvider implements CalendarProvider using Graph REST API.
MicrosoftTeamsProvider creates online meetings and extracts Teams URLs.
Adds Microsoft cache invalidation tags."
```

---

## Task 9: Provider Factory

Create the factory that resolves the correct provider from a user's `oauth_connections`.

**Files:**

- Create: `apps/web/src/server/services/calendar/calendar-provider-factory.ts`

- [ ] **Step 1: Create CalendarProviderFactory**

```typescript
import { err, ok } from "neverthrow";

import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { OAuthConnectionsQueries } from "@/server/data-access/oauth-connections.queries";

import type { CalendarProvider } from "./calendar-provider";
import { GoogleCalendarProvider } from "./google-calendar.provider";
import type { MeetingLinkProvider } from "./meeting-link-provider";
import { GoogleMeetProvider } from "./google-meet.provider";
import { MicrosoftCalendarProvider } from "./microsoft-calendar.provider";
import { MicrosoftTeamsProvider } from "./microsoft-teams.provider";

export type ProviderType = "google" | "microsoft";

export async function getCalendarProvider(
  userId: string,
  preferredProvider?: ProviderType,
): Promise<
  ActionResult<{ provider: CalendarProvider; providerType: ProviderType }>
> {
  if (preferredProvider) {
    const connection = await OAuthConnectionsQueries.getOAuthConnection(
      userId,
      preferredProvider,
    );
    if (connection) {
      const provider =
        preferredProvider === "google"
          ? new GoogleCalendarProvider()
          : new MicrosoftCalendarProvider();
      return ok({ provider, providerType: preferredProvider });
    }
  }

  // Fall back: try Google first, then Microsoft
  const google = await OAuthConnectionsQueries.getOAuthConnection(
    userId,
    "google",
  );
  if (google) {
    return ok({
      provider: new GoogleCalendarProvider(),
      providerType: "google",
    });
  }

  const microsoft = await OAuthConnectionsQueries.getOAuthConnection(
    userId,
    "microsoft",
  );
  if (microsoft) {
    return ok({
      provider: new MicrosoftCalendarProvider(),
      providerType: "microsoft",
    });
  }

  return err(ActionErrors.notFound("No calendar provider connected"));
}

export async function getMeetingLinkProvider(
  userId: string,
  preferredProvider?: ProviderType,
): Promise<
  ActionResult<{ provider: MeetingLinkProvider; providerType: ProviderType }>
> {
  if (preferredProvider) {
    const connection = await OAuthConnectionsQueries.getOAuthConnection(
      userId,
      preferredProvider,
    );
    if (connection) {
      const provider =
        preferredProvider === "google"
          ? new GoogleMeetProvider()
          : new MicrosoftTeamsProvider();
      return ok({ provider, providerType: preferredProvider });
    }
  }

  const google = await OAuthConnectionsQueries.getOAuthConnection(
    userId,
    "google",
  );
  if (google) {
    return ok({ provider: new GoogleMeetProvider(), providerType: "google" });
  }

  const microsoft = await OAuthConnectionsQueries.getOAuthConnection(
    userId,
    "microsoft",
  );
  if (microsoft) {
    return ok({
      provider: new MicrosoftTeamsProvider(),
      providerType: "microsoft",
    });
  }

  return err(ActionErrors.notFound("No meeting link provider connected"));
}

export async function getConnectedProviders(
  userId: string,
): Promise<ProviderType[]> {
  const providers: ProviderType[] = [];
  const google = await OAuthConnectionsQueries.getOAuthConnection(
    userId,
    "google",
  );
  if (google) providers.push("google");
  const microsoft = await OAuthConnectionsQueries.getOAuthConnection(
    userId,
    "microsoft",
  );
  if (microsoft) providers.push("microsoft");
  return providers;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/web && pnpm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/server/services/calendar/calendar-provider-factory.ts
git commit -m "feat(calendar): add provider factory for CalendarProvider and MeetingLinkProvider

Resolves correct provider from user's oauth_connections.
Supports preferred provider override. Falls back Google → Microsoft."
```

---

## Task 10: Bot Session Dedup Query + Unified Calendar Monitor

Add `findByMeetingUrls` query and refactor `BotCalendarMonitorService` to be provider-agnostic.

**Files:**

- Modify: `apps/web/src/server/data-access/bot-sessions.queries.ts`
- Modify: `apps/web/src/server/services/bot-calendar-monitor.service.ts`

- [ ] **Step 1: Add findByMeetingUrls to BotSessionsQueries**

In `apps/web/src/server/data-access/bot-sessions.queries.ts`, add a new static method:

```typescript
static async findByMeetingUrls(
  meetingUrls: string[],
  organizationId: string,
): Promise<Set<string>> {
  if (meetingUrls.length === 0) return new Set();
  const results = await db
    .select({ meetingUrl: botSessions.meetingUrl })
    .from(botSessions)
    .where(
      and(
        inArray(botSessions.meetingUrl, meetingUrls),
        eq(botSessions.organizationId, organizationId),
      ),
    );
  return new Set(results.map((r) => r.meetingUrl).filter(Boolean) as string[]);
}
```

- [ ] **Step 2: Refactor BotCalendarMonitorService**

In `apps/web/src/server/services/bot-calendar-monitor.service.ts`:

1. Replace direct `GoogleCalendarService` and `GoogleOAuthService` imports with calendar provider factory imports
2. In `processUserCalendar`:
   - Get all connected providers for the user via `getConnectedProviders(userId)`
   - For each provider, get `CalendarProvider` and `MeetingLinkProvider` via factory
   - Fetch upcoming meetings via `provider.getUpcomingMeetings()`
   - Extract meeting URLs via `meetingLinkProvider.extractMeetingUrl()`
   - Before creating bot sessions, call `BotSessionsQueries.findByMeetingUrls()` to get existing URLs
   - Skip events whose meeting URL is already in the existing set (cross-provider dedup)
   - Add `provider` to bot session metadata
3. Keep `findByCalendarEventId` check too (same-provider dedup)

- [ ] **Step 3: Verify typecheck**

Run: `cd apps/web && pnpm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/server/data-access/bot-sessions.queries.ts apps/web/src/server/services/bot-calendar-monitor.service.ts
git commit -m "feat(calendar): make calendar monitor provider-agnostic

Adds findByMeetingUrls batch query for cross-provider dedup.
Monitor now processes all connected providers per user.
Bot session metadata includes provider field."
```

---

## Task 11: Microsoft Connection Server Actions

Create the connect/disconnect/status server actions for Microsoft.

**Files:**

- Create: `apps/web/src/features/integrations/microsoft/actions/connect.ts`
- Create: `apps/web/src/features/integrations/microsoft/actions/disconnect.ts`
- Create: `apps/web/src/features/integrations/microsoft/actions/connection-status.ts`

- [ ] **Step 1: Create connection actions**

Follow the exact pattern from `apps/web/src/features/settings/actions/google-connection.ts`:

- `getMicrosoftConnectionStatus` — uses `authorizedActionClient`, calls `MicrosoftOAuthService.getConnectionStatus()`
- `disconnectMicrosoftAccount` — uses `authorizedActionClient`, calls `MicrosoftOAuthService.disconnect()`, `CacheInvalidation.invalidateMicrosoftConnection()`, `revalidatePath("/settings")`

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/web && pnpm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/integrations/microsoft/actions/
git commit -m "feat(microsoft): add connection management server actions

getMicrosoftConnectionStatus, disconnectMicrosoftAccount following
the same authorizedActionClient pattern as Google."
```

---

## Task 12: Refactor Existing Server Actions to Be Provider-Agnostic

Update existing meeting/calendar actions to use the provider factory.

**Files:**

- Modify: `apps/web/src/features/meetings/actions/create-calendar-event-with-bot.ts`
- Modify: `apps/web/src/features/meetings/actions/get-meetings.ts`
- Modify: `apps/web/src/features/meetings/actions/update-meeting-details.ts`
- Modify: `apps/web/src/features/tasks/actions/create-calendar-event.ts`

- [ ] **Step 1: Update create-calendar-event-with-bot**

Replace direct `GoogleOAuthService.hasConnection` / `GoogleCalendarService.createEvent` with:

- Use `getCalendarProvider(userId)` from factory
- Add optional `provider` field to the input schema
- Use `getMeetingLinkProvider()` for meeting URL extraction

- [ ] **Step 2: Update get-meetings**

Replace `GoogleCalendarService.getUpcomingMeetings` with factory-resolved provider.

- [ ] **Step 3: Update remaining actions**

Apply the same pattern to `update-meeting-details.ts` and `create-calendar-event.ts`.

- [ ] **Step 4: Verify typecheck**

Run: `cd apps/web && pnpm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/meetings/actions/ apps/web/src/features/tasks/actions/
git commit -m "refactor(actions): make calendar actions provider-agnostic

All calendar-related server actions now use CalendarProvider factory
instead of direct GoogleCalendarService/GoogleOAuthService calls.
Supports both Google and Microsoft transparently."
```

---

## Task 13: Microsoft UI Components

Create the Microsoft connection, settings, and status dashboard components.

**Files:**

- Create: `apps/web/src/features/integrations/microsoft/components/microsoft-connection.tsx`
- Create: `apps/web/src/features/integrations/microsoft/components/microsoft-settings.tsx`
- Create: `apps/web/src/features/integrations/microsoft/components/microsoft-status-dashboard.tsx`
- Create: `apps/web/src/features/integrations/microsoft/hooks/use-microsoft-scope-check.ts`

- [ ] **Step 1: Create use-microsoft-scope-check hook**

Follow the pattern from `apps/web/src/features/integrations/google/hooks/use-scope-check.ts` but use Microsoft scope utilities.

- [ ] **Step 2: Create microsoft-connection component**

Mirror `apps/web/src/features/settings/components/google-connection.tsx`:

- Show connection status with badge
- Granular permissions grid for Microsoft scope tiers
- Incremental permission buttons
- Disconnect confirmation dialog
- Uses `getMicrosoftConnectionStatus` and `disconnectMicrosoftAccount` actions

- [ ] **Step 3: Create microsoft-settings component**

Mirror `apps/web/src/features/settings/components/google-settings.tsx`:

- Auto-calendar toggle
- Default event duration
- Priority filter
- Project-scoped overrides

- [ ] **Step 4: Create microsoft-status-dashboard component**

Mirror `apps/web/src/features/settings/components/google-status-dashboard.tsx`.

- [ ] **Step 5: Verify typecheck and lint**

Run: `cd apps/web && pnpm run typecheck && pnpm lint`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/integrations/microsoft/components/ apps/web/src/features/integrations/microsoft/hooks/
git commit -m "feat(microsoft): add connection, settings, and status UI components

Microsoft connection management, settings configuration, and status
dashboard components. Follows the same patterns as Google equivalents."
```

---

## Task 14: Update Existing UI Components

Modify shared components to support Microsoft as a provider option.

**Files:**

- Modify: `apps/web/src/features/integrations/google/components/incremental-permission-dialog.tsx`
- Modify: Settings page layout (add Microsoft section)
- Modify: `apps/web/src/features/meetings/components/create-event-dialog.tsx`

- [ ] **Step 1: Add Microsoft to incremental permission dialog**

Either make the existing dialog provider-agnostic (accepting a `provider` prop and using the right scope labels), or create a separate `MicrosoftIncrementalPermissionDialog` if the Google one is too tightly coupled.

- [ ] **Step 2: Add Microsoft section to settings page**

In the integrations settings page, add the `MicrosoftConnection`, `MicrosoftSettings`, and `MicrosoftStatusDashboard` components alongside the existing Google components.

- [ ] **Step 3: Add provider selector to create-event-dialog**

When user has both providers connected:

- Add a provider selector (dropdown)
- Read `preferredCalendarProvider` from bot_settings for default
- Pass selected provider to `createCalendarEventWithBot` action

- [ ] **Step 4: Verify typecheck and lint**

Run: `cd apps/web && pnpm run typecheck && pnpm lint`

- [ ] **Step 5: Verify build**

Run: `cd apps/web && pnpm run build`
Expected: Clean build

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/integrations/ apps/web/src/features/settings/ apps/web/src/features/meetings/
git commit -m "feat(ui): add Microsoft provider to settings and event creation

Incremental permission dialog supports Microsoft scopes.
Settings page shows Microsoft section alongside Google.
Event creation dialog has provider selector for dual-provider users."
```

---

## Task 15: Environment Variable Documentation

Update docs with Microsoft-specific variables.

**Files:**

- Modify: `docs/ENVIRONMENT_VARIABLES.md`
- Modify: `infrastructure/TERRAFORM_VARIABLES.md`

- [ ] **Step 1: Update ENVIRONMENT_VARIABLES.md**

Add Microsoft OAuth section alongside existing Google section:

```markdown
### Microsoft OAuth (Integration)

| Variable                  | Required | Default                                         | Description                                     |
| ------------------------- | -------- | ----------------------------------------------- | ----------------------------------------------- |
| `MICROSOFT_CLIENT_ID`     | Optional | —                                               | Azure App Registration client ID                |
| `MICROSOFT_CLIENT_SECRET` | Optional | —                                               | Azure App Registration client secret            |
| `MICROSOFT_TENANT_ID`     | Optional | `common`                                        | Azure AD tenant (common/organizations/specific) |
| `MICROSOFT_REDIRECT_URI`  | Optional | `{APP_URL}/api/integrations/microsoft/callback` | OAuth callback URL                              |
```

- [ ] **Step 2: Update TERRAFORM_VARIABLES.md**

Add Microsoft variables to the deployment variables section.

- [ ] **Step 3: Commit**

```bash
git add docs/ENVIRONMENT_VARIABLES.md infrastructure/TERRAFORM_VARIABLES.md
git commit -m "docs: add Microsoft OAuth environment variables

Documents MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET,
MICROSOFT_TENANT_ID, and MICROSOFT_REDIRECT_URI for both
local development and infrastructure deployment."
```

---

## Task 16: Final Verification

End-to-end verification that everything compiles and builds.

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `cd apps/web && pnpm run typecheck`
Expected: Clean pass

- [ ] **Step 2: Run lint**

Run: `cd apps/web && pnpm lint`
Expected: No new warnings/errors vs. baseline

- [ ] **Step 3: Run build**

Run: `cd apps/web && pnpm run build`
Expected: Clean build

- [ ] **Step 4: Manual smoke test checklist**

Verify the following in the dev environment (`pnpm dev:web`):

1. Settings page loads with both Google and Microsoft sections
2. "Connect Microsoft" button initiates OAuth flow (requires Azure App Registration)
3. Calendar monitor cron doesn't crash when processing users with no Microsoft connection
4. Create event dialog shows provider selector when applicable
5. Existing Google features are unaffected

---

## Dependency Graph

```
Task 1 (DB Migrations)
  ↓
Task 2 (OAuth Base Service) → Task 4 (Microsoft OAuth Service) → Task 5 (OAuth Routes)
  ↓
Task 3 (Microsoft OAuth Lib) → Task 4
  ↓
Task 6 (Calendar Interfaces) → Task 7 (Google Providers) → Task 9 (Factory) → Task 10 (Monitor Refactor)
                              → Task 8 (Microsoft Providers + Cache) → Task 9
  ↓
Task 10 → Task 12 (Action Refactor)
Task 11 (Microsoft Actions) → Task 13 (Microsoft UI) → Task 14 (Updated UI)
Task 15 (Env Docs) — independent
Task 16 (Verification) — after all tasks
```

Tasks 1, 3, 6, 15 can be parallelized. Tasks 2 and 3 can run in parallel. Tasks 7 and 8 can run in parallel after Task 6.
