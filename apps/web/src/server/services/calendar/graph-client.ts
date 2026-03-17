import { err, ok } from "neverthrow";

import type { ActionResult } from "@/lib/server-action-client/action-errors";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { logger } from "@/lib/logger";

export const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

/**
 * Regular expression to extract Microsoft Teams meeting join URLs from text.
 * Matches URLs like: https://teams.microsoft.com/l/meetup-join/...
 */
export const TEAMS_URL_REGEX =
  /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"<>]+/;

/**
 * Extract a Microsoft Teams meeting URL from event fields using regex.
 */
export function extractTeamsUrl(event: {
  location?: { displayName?: string } | null;
  bodyPreview?: string;
}): string | null {
  const location = event.location?.displayName;
  if (location) {
    const match = location.match(TEAMS_URL_REGEX);
    if (match) {
      return match[0];
    }
  }

  const bodyPreview = event.bodyPreview;
  if (bodyPreview) {
    const match = bodyPreview.match(TEAMS_URL_REGEX);
    if (match) {
      return match[0];
    }
  }

  return null;
}

/**
 * Make an authenticated request to the Microsoft Graph API.
 * Returns the parsed JSON response or an ActionResult error.
 */
export async function graphRequest<T>(
  accessToken: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<ActionResult<T>> {
  const url = `${GRAPH_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error("Microsoft Graph API request failed", {
      status: String(response.status),
      path,
      errorBody,
    });

    if (response.status === 401) {
      return err(
        ActionErrors.unauthenticated(
          "Microsoft Graph API authentication failed",
          "graphRequest",
        ),
      );
    }

    if (response.status === 403) {
      return err(
        ActionErrors.forbidden(
          "Insufficient permissions for Microsoft Graph API",
          undefined,
          "graphRequest",
        ),
      );
    }

    if (response.status === 404) {
      return err(
        ActionErrors.notFound("Microsoft Graph resource", "graphRequest"),
      );
    }

    return err(
      ActionErrors.internal(
        `Microsoft Graph API error (${response.status}): ${errorBody}`,
        undefined,
        "graphRequest",
      ),
    );
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return ok({} as T);
  }

  const data = (await response.json()) as T;
  return ok(data);
}
