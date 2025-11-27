import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  integrationTemplates,
  type IntegrationTemplate,
  type NewIntegrationTemplate,
} from "../db/schema/integration-templates";

export class IntegrationTemplatesQueries {
  static async getByUser(
    userId: string,
    provider: "google" | "microsoft",
    templateType: "email" | "calendar"
  ): Promise<IntegrationTemplate[]> {
    return await db
      .select()
      .from(integrationTemplates)
      .where(
        and(
          eq(integrationTemplates.userId, userId),
          eq(integrationTemplates.provider, provider),
          eq(integrationTemplates.templateType, templateType)
        )
      );
  }

  static async getDefault(
    userId: string,
    provider: "google" | "microsoft",
    templateType: "email" | "calendar"
  ): Promise<IntegrationTemplate | null> {
    const [template] = await db
      .select()
      .from(integrationTemplates)
      .where(
        and(
          eq(integrationTemplates.userId, userId),
          eq(integrationTemplates.provider, provider),
          eq(integrationTemplates.templateType, templateType),
          eq(integrationTemplates.isDefault, true)
        )
      )
      .limit(1);
    return template ?? null;
  }

  static async unsetDefaults(
    userId: string,
    provider: "google" | "microsoft",
    templateType: "email" | "calendar"
  ): Promise<void> {
    await db
      .update(integrationTemplates)
      .set({ isDefault: false })
      .where(
        and(
          eq(integrationTemplates.userId, userId),
          eq(integrationTemplates.provider, provider),
          eq(integrationTemplates.templateType, templateType)
        )
      );
  }

  static async update(
    id: string,
    userId: string,
    data: Partial<Omit<IntegrationTemplate, "id" | "createdAt" | "updatedAt">>
  ): Promise<IntegrationTemplate | undefined> {
    const [updated] = await db
      .update(integrationTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(integrationTemplates.id, id),
          eq(integrationTemplates.userId, userId)
        )
      )
      .returning();
    return updated;
  }

  static async create(
    data: NewIntegrationTemplate
  ): Promise<IntegrationTemplate> {
    const [created] = await db
      .insert(integrationTemplates)
      .values(data)
      .returning();
    return created;
  }

  static async delete(templateId: string, userId: string): Promise<void> {
    await db
      .delete(integrationTemplates)
      .where(
        and(
          eq(integrationTemplates.id, templateId),
          eq(integrationTemplates.userId, userId)
        )
      );
  }
}

