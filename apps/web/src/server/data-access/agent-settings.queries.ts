import { db } from "@/server/db";
import { agentSettings, type AgentSettings, type NewAgentSettings } from "@/server/db/schema/agent-settings";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export class AgentSettingsQueries {
  private static readonly DEFAULT_ID = "default";

  /**
   * Get agent settings (creates default if doesn't exist)
   */
  static async getAgentSettings(): Promise<AgentSettings> {
    try {
      let settings = await db
        .select()
        .from(agentSettings)
        .where(eq(agentSettings.id, this.DEFAULT_ID))
        .limit(1);

      if (settings.length === 0) {
        // Create default settings if they don't exist
        const defaultSettings: NewAgentSettings = {
          id: this.DEFAULT_ID,
          model: "gpt-5-nano",
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

      return settings[0]!;
    } catch (error) {
      logger.error("Error getting agent settings", { error });
      throw error;
    }
  }

  /**
   * Update agent settings
   */
  static async updateAgentSettings(
    updates: Partial<Omit<AgentSettings, "id" | "createdAt" | "updatedAt">>
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

