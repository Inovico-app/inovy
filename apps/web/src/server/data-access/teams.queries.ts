import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { teams, type NewTeam, type Team } from "../db/schema";

/**
 * Database queries for Team operations
 * Pure data access layer - no business logic
 */
export class TeamQueries {
  /**
   * Create a new team
   */
  static async insertTeam(data: NewTeam): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning();

    return team;
  }

  /**
   * Get all teams for an organization
   */
  static async selectTeamsByOrganization(
    organizationId: string
  ): Promise<Team[]> {
    return await db
      .select()
      .from(teams)
      .where(eq(teams.organizationId, organizationId))
      .orderBy(teams.name);
  }

  /**
   * Get teams by department
   */
  static async selectTeamsByDepartment(departmentId: string): Promise<Team[]> {
    return await db
      .select()
      .from(teams)
      .where(eq(teams.departmentId, departmentId))
      .orderBy(teams.name);
  }

  /**
   * Get teams without a department (standalone teams)
   */
  static async selectStandaloneTeams(organizationId: string): Promise<Team[]> {
    return await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.organizationId, organizationId),
          isNull(teams.departmentId)
        )
      )
      .orderBy(teams.name);
  }

  /**
   * Get a team by ID
   */
  static async selectTeamById(id: string): Promise<Team | null> {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);

    return team ?? null;
  }

  /**
   * Update a team
   */
  static async updateTeam(
    id: string,
    data: Partial<Omit<NewTeam, "id" | "organizationId" | "createdAt">>
  ): Promise<Team | null> {
    const [team] = await db
      .update(teams)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id))
      .returning();

    return team ?? null;
  }

  /**
   * Delete a team
   */
  static async deleteTeam(id: string): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  }
}

