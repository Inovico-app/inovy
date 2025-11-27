import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  integrationSettings,
  type IntegrationSettings,
  type NewIntegrationSettings,
} from "../db/schema/integration-settings";

export class IntegrationSettingsQueries {
  static async getByUserAndProvider(
    userId: string,
    provider: "google" | "microsoft",
    projectId?: string
  ): Promise<IntegrationSettings | null> {
    if (projectId) {
      const [projectSettings] = await db
        .select()
        .from(integrationSettings)
        .where(
          and(
            eq(integrationSettings.userId, userId),
            eq(integrationSettings.provider, provider),
            eq(integrationSettings.projectId, projectId)
          )
        )
        .limit(1);
      if (projectSettings) return projectSettings;
    }
    const [globalSettings] = await db
      .select()
      .from(integrationSettings)
      .where(
        and(
          eq(integrationSettings.userId, userId),
          eq(integrationSettings.provider, provider),
          isNull(integrationSettings.projectId)
        )
      )
      .limit(1);
    return globalSettings ?? null;
  }

  static async update(
    id: string,
    data: Partial<Omit<IntegrationSettings, "id" | "createdAt" | "updatedAt">>
  ): Promise<IntegrationSettings | undefined> {
    const [updated] = await db
      .update(integrationSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(integrationSettings.id, id))
      .returning();
    return updated;
  }

  static async create(
    data: NewIntegrationSettings
  ): Promise<IntegrationSettings> {
    const [created] = await db
      .insert(integrationSettings)
      .values(data)
      .returning();
    return created;
  }

  static async delete(
    userId: string,
    provider: "google" | "microsoft",
    projectId?: string
  ): Promise<void> {
    await db
      .delete(integrationSettings)
      .where(
        and(
          eq(integrationSettings.userId, userId),
          eq(integrationSettings.provider, provider),
          projectId
            ? eq(integrationSettings.projectId, projectId)
            : isNull(integrationSettings.projectId)
        )
      );
  }
}

