import { err, ok } from "neverthrow";

import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { OAuthConnectionsQueries } from "@/server/data-access/oauth-connections.queries";
import type { OAuthConnection } from "@/server/db/schema/oauth-connections";

import type { CalendarProvider } from "./calendar-provider";
import { GoogleCalendarProvider } from "./google-calendar.provider";
import type { MeetingLinkProvider } from "./meeting-link-provider";
import { GoogleMeetProvider } from "./google-meet.provider";
import { MicrosoftCalendarProvider } from "./microsoft-calendar.provider";
import { MicrosoftTeamsProvider } from "./microsoft-teams.provider";

export type ProviderType = "google" | "microsoft";

/**
 * Resolve the best available provider connection for a user.
 * If a preferred provider is specified and connected, use it.
 * Otherwise, fall back to Google then Microsoft (checked in parallel).
 */
async function resolveProviderConnection(
  userId: string,
  preferredProvider?: ProviderType,
): Promise<{ providerType: ProviderType; connection: OAuthConnection } | null> {
  if (preferredProvider) {
    const connection = await OAuthConnectionsQueries.getOAuthConnection(
      userId,
      preferredProvider,
    );
    if (connection) {
      return { providerType: preferredProvider, connection };
    }
  }

  const [google, microsoft] = await Promise.all([
    OAuthConnectionsQueries.getOAuthConnection(userId, "google"),
    OAuthConnectionsQueries.getOAuthConnection(userId, "microsoft"),
  ]);

  if (google) return { providerType: "google", connection: google };
  if (microsoft) return { providerType: "microsoft", connection: microsoft };
  return null;
}

export async function getCalendarProvider(
  userId: string,
  preferredProvider?: ProviderType,
): Promise<
  ActionResult<{ provider: CalendarProvider; providerType: ProviderType }>
> {
  const resolved = await resolveProviderConnection(userId, preferredProvider);

  if (!resolved) {
    return err(ActionErrors.notFound("No calendar provider connected"));
  }

  const provider =
    resolved.providerType === "google"
      ? new GoogleCalendarProvider()
      : new MicrosoftCalendarProvider();

  return ok({ provider, providerType: resolved.providerType });
}

export async function getMeetingLinkProvider(
  userId: string,
  preferredProvider?: ProviderType,
): Promise<
  ActionResult<{ provider: MeetingLinkProvider; providerType: ProviderType }>
> {
  const resolved = await resolveProviderConnection(userId, preferredProvider);

  if (!resolved) {
    return err(ActionErrors.notFound("No meeting link provider connected"));
  }

  const provider =
    resolved.providerType === "google"
      ? new GoogleMeetProvider()
      : new MicrosoftTeamsProvider();

  return ok({ provider, providerType: resolved.providerType });
}

export async function getConnectedProviders(
  userId: string,
): Promise<ProviderType[]> {
  const [google, microsoft] = await Promise.all([
    OAuthConnectionsQueries.getOAuthConnection(userId, "google"),
    OAuthConnectionsQueries.getOAuthConnection(userId, "microsoft"),
  ]);

  const providers: ProviderType[] = [];
  if (google) providers.push("google");
  if (microsoft) providers.push("microsoft");
  return providers;
}
