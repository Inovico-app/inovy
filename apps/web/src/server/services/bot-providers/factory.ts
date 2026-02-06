import { RecallBotProvider } from "./recall/recall-provider";
import type { BotProvider, BotProviderType } from "./types";

/**
 * Bot Provider Factory
 * Creates bot provider instances based on provider type
 */
export class BotProviderFactory {
  /**
   * Create a bot provider instance
   * @param providerType - Type of provider to create
   * @returns BotProvider instance
   * @throws Error if provider type is not supported
   */
  static create(providerType: BotProviderType): BotProvider {
    switch (providerType) {
      case "recall":
        return new RecallBotProvider();
      case "teams":
        // Future implementation for Microsoft Teams
        throw new Error("Microsoft Teams provider not yet implemented");
      default:
        throw new Error(`Unsupported bot provider type: ${providerType}`);
    }
  }

  /**
   * Get default provider (currently Recall.ai)
   */
  static getDefault(): BotProvider {
    return new RecallBotProvider();
  }
}

