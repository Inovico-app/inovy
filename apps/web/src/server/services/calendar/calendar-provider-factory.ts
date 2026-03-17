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
