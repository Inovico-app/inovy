import { logger, serializeError } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { RecallApiService } from "@/server/services/recall-api.service";
import { getRecallApiKey } from "@/server/services/recall-api.utils";
import { secureFetch } from "@/server/lib/secure-fetch";
import { err, ok } from "neverthrow";
import type {
  BotProvider,
  BotProviderConfig,
  BotProviderType,
  BotSessionResult,
  BotSessionStatus,
} from "../types";
import { mapRecallStatusToBotStatus } from "./status-mapper";

/**
 * Recall.ai Bot Provider Implementation
 * Wraps RecallApiService to implement BotProvider interface
 */
export class RecallBotProvider implements BotProvider {
  getProviderType(): BotProviderType {
    return "recall";
  }

  async createSession(
    config: BotProviderConfig
  ): Promise<ActionResult<BotSessionResult>> {
    try {
      const result = await RecallApiService.createBotSession(
        config.meetingUrl,
        config.customMetadata
      );

      if (result.isErr()) {
        return err(result.error);
      }

      const { botId, status } = result.value;
      const internalStatus = mapRecallStatusToBotStatus(status);

      return ok({
        providerId: botId,
        status,
        internalStatus,
      });
    } catch (error) {
      logger.error("Failed to create Recall.ai bot session", {
        component: "RecallBotProvider.createSession",
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to create bot session",
          error as Error,
          "RecallBotProvider.createSession"
        )
      );
    }
  }

  async getSessionStatus(
    providerId: string
  ): Promise<ActionResult<BotSessionStatus>> {
    try {
      const result = await RecallApiService.getBotDetails(providerId);

      if (result.isErr()) {
        return err(result.error);
      }

      const { status, recordings } = result.value;
      const internalStatus = mapRecallStatusToBotStatus(status);

      // Extract recording URL from recordings array if available
      // Format: recordings[].media_shortcuts.video_mixed.data.download_url
      let recordingUrl: string | undefined;
      if (recordings && Array.isArray(recordings) && recordings.length > 0) {
        const latestRecording = recordings[recordings.length - 1] as {
          media_shortcuts?: {
            video_mixed?: {
              data?: {
                download_url?: string;
              };
            };
          };
        };
        recordingUrl =
          latestRecording?.media_shortcuts?.video_mixed?.data?.download_url;
      }

      return ok({
        providerId,
        status,
        internalStatus,
        recordingUrl,
      });
    } catch (error) {
      logger.error("Failed to get Recall.ai bot status", {
        component: "RecallBotProvider.getSessionStatus",
        providerId,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to get bot status",
          error as Error,
          "RecallBotProvider.getSessionStatus"
        )
      );
    }
  }

  async terminateSession(providerId: string): Promise<ActionResult<void>> {
    try {
      const apiKey = getRecallApiKey();
      const response = await secureFetch(
        `${RecallApiService.API_BASE_URL}/bot/${providerId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Token ${apiKey}`,
          },
          signal: AbortSignal.timeout(30000),
          certificateValidation: {
            nearExpiryWarningDays: 30,
            strictValidation: true,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Failed to terminate Recall.ai bot session", {
          component: "RecallBotProvider.terminateSession",
          providerId,
          status: response.status,
          error: errorText,
        });

        return err(
          ActionErrors.internal(
            `Failed to terminate bot session: ${response.statusText}`,
            new Error(errorText),
            "RecallBotProvider.terminateSession"
          )
        );
      }

      logger.info("Successfully terminated Recall.ai bot session", {
        component: "RecallBotProvider.terminateSession",
        providerId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to terminate Recall.ai bot session", {
        component: "RecallBotProvider.terminateSession",
        providerId,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to terminate bot session",
          error as Error,
          "RecallBotProvider.terminateSession"
        )
      );
    }
  }

  async getRecordingDownloadUrl(
    providerId: string
  ): Promise<ActionResult<string>> {
    try {
      const apiKey = getRecallApiKey();
      const response = await secureFetch(
        `${RecallApiService.API_BASE_URL}/bot/${providerId}/`,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${apiKey}`,
          },
          signal: AbortSignal.timeout(30000),
          certificateValidation: {
            nearExpiryWarningDays: 30,
            strictValidation: true,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Failed to get Recall.ai bot details", {
          component: "RecallBotProvider.getRecordingDownloadUrl",
          providerId,
          status: response.status,
          error: errorText,
        });

        return err(
          ActionErrors.internal(
            `Failed to get bot details: ${response.statusText}`,
            new Error(errorText),
            "RecallBotProvider.getRecordingDownloadUrl"
          )
        );
      }

      const data = await response.json();

      // Extract recording URL from Recall.ai response
      // Format: recordings[].media_shortcuts.video_mixed.data.download_url
      if (
        data.recordings &&
        Array.isArray(data.recordings) &&
        data.recordings.length > 0
      ) {
        const latestRecording = data.recordings[data.recordings.length - 1];
        const downloadUrl =
          latestRecording?.media_shortcuts?.video_mixed?.data?.download_url;

        if (downloadUrl) {
          return ok(downloadUrl);
        }
      }

      // No recording available yet
      return err(
        ActionErrors.notFound(
          "Recording not available yet",
          "RecallBotProvider.getRecordingDownloadUrl"
        )
      );
    } catch (error) {
      logger.error("Failed to get recording download URL", {
        component: "RecallBotProvider.getRecordingDownloadUrl",
        providerId,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to get recording URL",
          error as Error,
          "RecallBotProvider.getRecordingDownloadUrl"
        )
      );
    }
  }
}

