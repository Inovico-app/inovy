import { err, ok } from "neverthrow";
import { logger, serializeError } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { getRecallApiKey } from "./recall-api.utils";

/**
 * Recall.ai API Service
 * Handles interactions with Recall.ai API for bot session management
 * Uses EU Central region (eu-central-1)
 */
export class RecallApiService {
  static readonly API_BASE_URL = "https://eu-central-1.recall.ai/api/v1";

  private static getWebhookBaseUrl(): string {
    const webhookBaseUrl =
      process.env.WEBHOOK_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (!webhookBaseUrl) {
      throw new Error(
        "WEBHOOK_BASE_URL or NEXT_PUBLIC_APP_URL environment variable must be set"
      );
    }
    return webhookBaseUrl;
  }

  /**
   * Create a bot session via Recall.ai API
   * @param meetingUrl - The meeting URL to join
   * @param customMetadata - Custom metadata to attach (e.g., projectId)
   * @returns Result containing bot session ID and details
   */
  static async createBotSession(
    meetingUrl: string,
    customMetadata?: Record<string, string>
  ): Promise<ActionResult<{ botId: string; status: string }>> {
    try {
      const apiKey = getRecallApiKey();
      const webhookUrl = `${this.getWebhookBaseUrl()}/api/webhooks/recall`;

      logger.info("Creating Recall.ai bot session", {
        component: "RecallApiService.createBotSession",
        region: "eu-central-1",
        apiBaseUrl: RecallApiService.API_BASE_URL,
        customMetadata,
      });

      const response = await fetch(`${RecallApiService.API_BASE_URL}/bot/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meeting_url: meetingUrl,
          webhook_url: webhookUrl,
          custom_metadata: customMetadata ?? {},
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Recall.ai API error", {
          component: "RecallApiService.createBotSession",
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        return err(
          ActionErrors.internal(
            `Recall.ai API error: ${response.statusText}`,
            new Error(errorText),
            "RecallApiService.createBotSession"
          )
        );
      }

      const data = await response.json();

      if (!data.id) {
        logger.error("Invalid Recall.ai API response: missing bot ID", {
          component: "RecallApiService.createBotSession",
          response: data,
        });
        return err(
          ActionErrors.internal(
            "Invalid API response: missing bot ID",
            new Error("Response validation failed"),
            "RecallApiService.createBotSession"
          )
        );
      }

      logger.info("Successfully created Recall.ai bot session", {
        component: "RecallApiService.createBotSession",
        botId: data.id,
        status: data.status,
      });

      return ok({
        botId: data.id,
        status: data.status ?? "joining",
      });
    } catch (error) {
      logger.error("Failed to create Recall.ai bot session", {
        component: "RecallApiService.createBotSession",
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to create bot session",
          error as Error,
          "RecallApiService.createBotSession"
        )
      );
    }
  }

  /**
   * Get bot session status
   * @param botId - The Recall.ai bot ID
   * @returns Result containing bot status
   */
  static async getBotStatus(
    botId: string
  ): Promise<ActionResult<{ status: string }>> {
    try {
      const apiKey = getRecallApiKey();

      const response = await fetch(
        `${RecallApiService.API_BASE_URL}/bot/${botId}/`,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${apiKey}`,
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Recall.ai API error", {
          component: "RecallApiService.getBotStatus",
          botId,
          status: response.status,
          error: errorText,
        });

        return err(
          ActionErrors.internal(
            `Failed to get bot status: ${response.statusText}`,
            new Error(errorText),
            "RecallApiService.getBotStatus"
          )
        );
      }

      const data = await response.json();

      return ok({
        status: data.status ?? "unknown",
      });
    } catch (error) {
      logger.error("Failed to get bot status", {
        component: "RecallApiService.getBotStatus",
        botId,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to get bot status",
          error as Error,
          "RecallApiService.getBotStatus"
        )
      );
    }
  }

  /**
   * Get full bot details including status and recordings
   * @param botId - The Recall.ai bot ID
   * @returns Result containing full bot details
   */
  static async getBotDetails(
    botId: string
  ): Promise<ActionResult<{ status: string; recordings?: unknown[] }>> {
    try {
      const apiKey = getRecallApiKey();

      const response = await fetch(
        `${RecallApiService.API_BASE_URL}/bot/${botId}/`,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${apiKey}`,
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Recall.ai API error", {
          component: "RecallApiService.getBotDetails",
          botId,
          status: response.status,
          error: errorText,
        });

        return err(
          ActionErrors.internal(
            `Failed to get bot details: ${response.statusText}`,
            new Error(errorText),
            "RecallApiService.getBotDetails"
          )
        );
      }

      const data = await response.json();

      return ok({
        status: data.status ?? "unknown",
        recordings: data.recordings,
      });
    } catch (error) {
      logger.error("Failed to get bot details", {
        component: "RecallApiService.getBotDetails",
        botId,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to get bot details",
          error as Error,
          "RecallApiService.getBotDetails"
        )
      );
    }
  }

  /**
   * Get recording download URL from bot details
   * Used when processing recording.done webhook (no URL in payload)
   * @param botId - Recall.ai bot ID
   * @param recordingId - Optional recording ID to match; if omitted, uses latest
   */
  static async getRecordingDownloadUrl(
    botId: string,
    recordingId?: string
  ): Promise<
    ActionResult<{
      url: string;
      duration?: number;
      format?: string;
      recordingId: string;
    }>
  > {
    const detailsResult = await this.getBotDetails(botId);
    if (detailsResult.isErr()) return err(detailsResult.error);

    const { recordings } = detailsResult.value;
    if (!recordings || !Array.isArray(recordings) || recordings.length === 0) {
      return err(
        ActionErrors.notFound(
          "No recordings available yet",
          "RecallApiService.getRecordingDownloadUrl"
        )
      );
    }

    const recording = recordingId
      ? (recordings as { id?: string }[]).find((r) => r.id === recordingId)
      : (recordings as unknown[])[recordings.length - 1];

    if (!recording || typeof recording !== "object") {
      return err(
        ActionErrors.notFound(
          "Recording not found",
          "RecallApiService.getRecordingDownloadUrl"
        )
      );
    }

    const rec = recording as {
      id?: string;
      media_shortcuts?: {
        video_mixed?: {
          data?: { download_url?: string };
          format?: string;
        };
      };
      completed_at?: string;
      started_at?: string;
    };

    const downloadUrl =
      rec.media_shortcuts?.video_mixed?.data?.download_url;
    if (!downloadUrl) {
      return err(
        ActionErrors.notFound(
          "Recording download URL not available yet",
          "RecallApiService.getRecordingDownloadUrl"
        )
      );
    }

    let duration: number | undefined;
    if (rec.completed_at && rec.started_at) {
      const start = new Date(rec.started_at).getTime();
      const end = new Date(rec.completed_at).getTime();
      if (Number.isFinite(start) && Number.isFinite(end)) {
        duration = Math.round((end - start) / 1000);
      }
    }

    const resolvedRecordingId = rec.id ?? recordingId;
    if (!resolvedRecordingId) {
      return err(
        ActionErrors.notFound(
          "Missing recording ID",
          "RecallApiService.getRecordingDownloadUrl"
        )
      );
    }

    return ok({
      url: downloadUrl,
      duration,
      format: rec.media_shortcuts?.video_mixed?.format,
      recordingId: resolvedRecordingId,
    });
  }
}

