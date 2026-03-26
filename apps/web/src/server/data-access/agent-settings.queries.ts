import { db } from "@/server/db";
import {
  agentSettings,
  type AgentSettings,
  type NewAgentSettings,
} from "@/server/db/schema/agent-settings";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export class AgentSettingsQueries {
  private static readonly DEFAULT_ID = "default";

  /** Map legacy OpenAI model IDs to their Anthropic replacements */
  private static readonly LEGACY_MODEL_MAP: Record<string, string> = {
    "gpt-5-nano": "claude-sonnet-4-6",
    "gpt-4o": "claude-sonnet-4-6",
    "gpt-4o-mini": "claude-sonnet-4-6",
    "gpt-4-turbo": "claude-sonnet-4-6",
    "gpt-4": "claude-sonnet-4-6",
    "gpt-3.5-turbo": "claude-haiku-4-5-20251001",
  };

  /** Migrate legacy model ID to current Anthropic equivalent */
  private static migrateModel(model: string): string {
    return this.LEGACY_MODEL_MAP[model] ?? model;
  }

  /**
   * Get agent settings (creates default if doesn't exist)
   */
  static async getAgentSettings(): Promise<AgentSettings> {
    try {
      const settings = await db
        .select()
        .from(agentSettings)
        .where(eq(agentSettings.id, this.DEFAULT_ID))
        .limit(1);

      if (settings.length === 0) {
        // Create default settings if they don't exist
        const defaultSettings: NewAgentSettings = {
          id: this.DEFAULT_ID,
          model: "claude-sonnet-4-6",
          maxTokens: 4000,
          maxContextTokens: 4000,
          temperature: 0.7,
          topP: 1.0,
          frequencyPenalty: 0.0,
          presencePenalty: 0.0,
        };

        const inserted = await db
          .insert(agentSettings)
          .values(defaultSettings)
          .returning();

        return inserted[0]!;
      }

      const result = settings[0]!;

      // Auto-migrate legacy OpenAI models to Anthropic equivalents
      const migratedModel = this.migrateModel(result.model);
      if (migratedModel !== result.model) {
        logger.info("Migrating legacy model to Anthropic", {
          component: "AgentSettingsQueries",
          from: result.model,
          to: migratedModel,
        });
        const updated = await db
          .update(agentSettings)
          .set({ model: migratedModel, updatedAt: new Date() })
          .where(eq(agentSettings.id, this.DEFAULT_ID))
          .returning();
        return updated[0]!;
      }

      return result;
    } catch (error) {
      logger.error("Error getting agent settings", { error });
      throw error;
    }
  }

  /**
   * Update agent settings
   */
  static async updateAgentSettings(
    updates: Partial<Omit<AgentSettings, "id" | "createdAt" | "updatedAt">>,
  ): Promise<AgentSettings> {
    try {
      // Ensure settings exist
      await this.getAgentSettings();

      const updated = await db
        .update(agentSettings)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(agentSettings.id, this.DEFAULT_ID))
        .returning();

      return updated[0]!;
    } catch (error) {
      logger.error("Error updating agent settings", { error });
      throw error;
    }
  }
}
