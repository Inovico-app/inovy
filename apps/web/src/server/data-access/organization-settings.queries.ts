import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  organizationSettings,
  type OrganizationSettings,
  type NewOrganizationSettings,
} from "../db/schema";

/**
 * Database queries for OrganizationSettings operations
 * Pure data access layer - no business logic
 */

export class OrganizationSettingsQueries {
  /**
   * Find organization settings by organization ID
   */
  static async findByOrganizationId(
    organizationId: string
  ): Promise<OrganizationSettings | null> {
    const result = await db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, organizationId))
      .limit(1);

    if (result.length === 0) return null;

    return result[0];
  }

  /**
   * Create or update organization settings (upsert)
   */
  static async createOrUpdate(
    data: NewOrganizationSettings
  ): Promise<OrganizationSettings> {
    return await db.transaction(async (tx) => {
      // Check if settings exist
      const existing = await tx
        .select()
        .from(organizationSettings)
        .where(eq(organizationSettings.organizationId, data.organizationId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        const [updated] = await tx
          .update(organizationSettings)
          .set({
            instructions: data.instructions,
            updatedAt: new Date(),
          })
          .where(eq(organizationSettings.organizationId, data.organizationId))
          .returning();

        return updated;
      } else {
        // Insert new
        const [created] = await tx
          .insert(organizationSettings)
          .values(data)
          .returning();

        return created;
      }
    });
  }

  /**
   * Update organization settings
   */
  static async update(
    organizationId: string,
    instructions: string
  ): Promise<OrganizationSettings | null> {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(organizationSettings)
        .set({
          instructions,
          updatedAt: new Date(),
        })
        .where(eq(organizationSettings.organizationId, organizationId))
        .returning();

      return updated || null;
    });
  }

  /**
   * Delete organization settings
   */
  static async delete(organizationId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const deletedRows = await tx
        .delete(organizationSettings)
        .where(eq(organizationSettings.organizationId, organizationId))
        .returning();

      return deletedRows.length > 0;
    });
  }
}

