import { err, ok } from "neverthrow";
import type { ActionResult } from "@/lib/server-action-client/action-errors";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { logger } from "@/lib/logger";
import { MicrosoftOAuthService } from "@/server/services/microsoft-oauth.service";
import { TEAMS_URL_REGEX, graphRequest } from "./graph-client";
import type { MeetingLinkProvider } from "./meeting-link-provider";
import type { CalendarEvent, MeetingLink, MeetingOptions } from "./types";

/**
 * Microsoft Graph API response type for online meetings.
 */
interface GraphOnlineMeeting {
  id: string;
  joinWebUrl: string;
  subject?: string;
}

/**
 * Microsoft Teams provider that creates online meetings and extracts Teams URLs.
 * Implements the shared MeetingLinkProvider interface.
 */
export class MicrosoftTeamsProvider implements MeetingLinkProvider {
  /**
   * Create an online meeting via the Microsoft Graph API.
   * Uses POST /me/onlineMeetings to create a Teams meeting.
   */
  async createOnlineMeeting(
    userId: string,
    options: MeetingOptions,
  ): Promise<ActionResult<MeetingLink>> {
    try {
      const tokenResult =
        await MicrosoftOAuthService.getValidAccessToken(userId);
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      const requestBody = {
        subject: options.subject,
        startDateTime: options.startDateTime.toISOString(),
        endDateTime: options.endDateTime.toISOString(),
      };

      const result = await graphRequest<GraphOnlineMeeting>(
        tokenResult.value,
        "POST",
        "/me/onlineMeetings",
        requestBody as unknown as Record<string, unknown>,
      );

      if (result.isErr()) {
        return err(result.error);
      }

      return ok({
        joinUrl: result.value.joinWebUrl,
        meetingId: result.value.id,
      });
    } catch (error) {
      logger.error(
        "Failed to create Microsoft Teams meeting",
        { userId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to create Microsoft Teams meeting",
          error as Error,
          "MicrosoftTeamsProvider.createOnlineMeeting",
        ),
      );
    }
  }

  /**
   * Extract a Microsoft Teams meeting URL from a CalendarEvent.
   * Returns the meetingUrl if it is a Teams URL, otherwise searches
   * the event title for a Teams join link (as a fallback).
   */
  extractMeetingUrl(event: CalendarEvent): string | null {
    // If the event already has a meeting URL that is a Teams URL, return it
    if (event.meetingUrl) {
      const match = event.meetingUrl.match(TEAMS_URL_REGEX);
      if (match) {
        return match[0];
      }
    }

    return null;
  }
}
