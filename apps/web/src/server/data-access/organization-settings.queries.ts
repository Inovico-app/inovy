import { eq } from "drizzle-orm";
import { db } from "../db";
import { organizationSettings } from "../db/schema";
import type {
  CreateOrganizationInstructionsDto,
  OrganizationInstructionsDto,
  UpdateOrganizationInstructionsDto,
} from "../dto/organization-settings.dto";

/**
 * Queries for organization settings/instructions
 */
export class OrganizationSettingsQueries {
  /**
   * Get organization instructions by organization ID
   */
  static async getInstructionsByOrganizationId(
    organizationId: string
  ): Promise<OrganizationInstructionsDto | null> {
    const result = await db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, organizationId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create organization instructions
   */
  static async createInstructions(
    data: CreateOrganizationInstructionsDto
  ): Promise<OrganizationInstructionsDto> {
    const result = await db
      .insert(organizationSettings)
      .values({
        organizationId: data.organizationId,
        instructions: data.instructions,
        createdById: data.createdById,
      })
      .returning();

    return result[0];
  }

  /**
   * Update organization instructions
   */
  static async updateInstructions(
    organizationId: string,
    data: UpdateOrganizationInstructionsDto
  ): Promise<OrganizationInstructionsDto | null> {
    const result = await db
      .update(organizationSettings)
      .set({
        instructions: data.instructions,
        updatedAt: new Date(),
      })
      .where(eq(organizationSettings.organizationId, organizationId))
      .returning();

    return result[0] || null;
  }

  /**
   * Check if instructions exist for an organization
   */
  static async instructionsExist(organizationId: string): Promise<boolean> {
    const result = await db
      .select({ id: organizationSettings.id })
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, organizationId))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Create default empty instructions for a new organization
   * Called during organization creation
   */
  static async createDefaultInstructions(
    organizationId: string,
    createdById: string
  ): Promise<OrganizationInstructionsDto> {
    const result = await db
      .insert(organizationSettings)
      .values({
        organizationId,
        instructions: "",
        createdById,
      })
      .returning();

    return result[0];
  }
}

