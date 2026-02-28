import type { ActionResult } from "@/lib/server-action-client/action-errors";
import type { BotStatus } from "@/server/db/schema/bot-sessions";

/**
 * Bot provider configuration for creating a session
 */
export interface BotProviderConfig {
  meetingUrl: string;
  customMetadata?: Record<string, string>;
  webhookUrl?: string;
  joinAt?: Date;
  botDisplayName?: string;
  botJoinMessage?: string | null;
  inactivityTimeoutMinutes?: number;
}

/**
 * Bot session creation result
 */
export interface BotSessionResult {
  providerId: string; // Provider-specific bot ID (e.g., Recall.ai bot ID)
  status: string; // Provider-specific status string
  internalStatus: BotStatus; // Mapped to internal status enum
}

/**
 * Bot session status result
 */
export interface BotSessionStatus {
  providerId: string;
  status: string; // Provider-specific status
  internalStatus: BotStatus; // Mapped to internal status
  recordingUrl?: string; // Available when recording is ready
}

/**
 * Supported bot providers
 */
export type BotProviderType = "recall" | "teams"; // Extensible for future providers

/**
 * Abstract BotProvider interface
 * All bot providers must implement this interface
 */
export interface BotProvider {
  /**
   * Create a bot session
   * @param config - Bot provider configuration
   * @returns Result with bot session ID and status
   */
  createSession(
    config: BotProviderConfig
  ): Promise<ActionResult<BotSessionResult>>;

  /**
   * Get bot session status
   * @param providerId - Provider-specific bot ID
   * @returns Result with bot status
   */
  getSessionStatus(providerId: string): Promise<ActionResult<BotSessionStatus>>;

  /**
   * Terminate bot session (force bot to leave)
   * @param providerId - Provider-specific bot ID
   * @returns Result indicating success/failure
   */
  terminateSession(providerId: string): Promise<ActionResult<void>>;

  /**
   * Get recording download URL
   * @param providerId - Provider-specific bot ID
   * @returns Result with recording URL (if available)
   */
  getRecordingDownloadUrl(providerId: string): Promise<ActionResult<string>>;

  /**
   * Get provider type identifier
   */
  getProviderType(): BotProviderType;
}

