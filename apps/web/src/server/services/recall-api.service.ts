import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { logger, serializeError } from "../../lib/logger";

/**
 * Recall.ai API Service
 * Handles interactions with Recall.ai API for bot session management
 */
export class RecallApiService {
  private static readonly API_BASE_URL = "https://api.recall.ai/api/v1";

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
   * Get API key from environment
   */
  private static getApiKey(): string {
    const apiKey = process.env.RECALL_API_KEY;
    if (!apiKey) {
      throw new Error("RECALL_API_KEY environment variable is not set");
    }
    return apiKey;
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
      const apiKey = this.getApiKey();
      const webhookUrl = `${this.getWebhookBaseUrl()}/api/bot/webhook/recall`;

      logger.info("Creating Recall.ai bot session", {
        component: "RecallApiService.createBotSession",
        customMetadata,
      });

      const response = await fetch(`${this.API_BASE_URL}/bot/`, {
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
      const apiKey = this.getApiKey();

      const response = await fetch(`${this.API_BASE_URL}/bot/${botId}/`, {
        method: "GET",
        headers: {
          Authorization: `Token ${apiKey}`,
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

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
}

